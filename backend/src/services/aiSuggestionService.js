import axios from 'axios';
import prisma from "../config/db.js";
import { geocodeRegionInVietnam, fetchPlacesByBbox } from "./geoapify.js";
import { mapGeoapifyFeatureToLocation, isVietnamLocation } from "./locationMapper.js";

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:8001';

/**
 * AI tự động tạo lịch trình chi tiết bằng Python Service (từ nhánh Xphu cũ)
 */
export async function generatePlanWithPythonAI({ region, days, budget, preferences }) {
    try {
        const response = await axios.post(`${PYTHON_AI_URL}/ai/generate-plan`, {
            destinationType: preferences?.includes("biển") ? "biển" : "văn hóa",
            placeTypes: preferences || ["cafe", "quán ăn"],
            region: region,
            weather: "nắng nhẹ",
            budget: budget || 5000000
        });
        return response.data;
    } catch (error) {
        console.error("Lỗi khi gọi Python AI Service:", error.message);
        throw error;
    }
}

const SUGGESTION_CATEGORIES = [
    "tourism",
    "tourism.attraction",
    "tourism.sights",
    "entertainment",
    "entertainment.museum",
    "catering.cafe",
    "catering.restaurant",
    "accommodation.hotel",
    "beach",
    "natural",
    "leisure.park"
];

/**
 * Gợi ý địa điểm dựa trên vùng + sở thích
 * Kết hợp: DB cache + Geoapify API + Gemini AI ranking
 */
export async function getSuggestions({ region, days, budget, preferences }) {
    console.log(`[AI] getSuggestions for region="${region}", days=${days}, budget=${budget}, prefs=${preferences?.join(',') || 'none'}`);
    
    // 1. Tìm trong DB trước (đã cache)
    let locations = await getLocationsFromDB(region);
    console.log(`[AI] Found ${locations.length} locations in DB`);

    // 2. Nếu DB ít data → fetch từ Geoapify và cache
    if (locations.length < 10) {
        try {
            const fetched = await fetchAndCacheFromGeoapify(region);
            locations = [...locations, ...fetched];
            console.log(`[AI] Fetched ${fetched.length} additional from Geoapify`);
        } catch (err) {
            console.error("[AI] Geoapify fetch error:", err.message);
        }
    }

    // 3. Remove duplicates by external_id
    const uniqueMap = new Map();
    for (const loc of locations) {
        const key = loc.external_id || loc.id?.toString();
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, loc);
        }
    }
    locations = Array.from(uniqueMap.values());

    // 4. Dùng Gemini AI để rank và gợi ý
    let aiSuggestions = null;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("[AI] ⚠️ GEMINI_API_KEY chưa được cấu hình trong .env → sẽ dùng rule-based scoring");
    } else {
        try {
            aiSuggestions = await getGeminiSuggestions(region, days, budget, preferences, locations);
            console.log(`[AI] Gemini returned ${aiSuggestions?.length || 0} scored suggestions`);
        } catch (err) {
            console.error("[AI] Gemini AI error:", err.message);
        }
    }

    // 5. Merge AI suggestions với location data
    const result = mergeAISuggestions(locations, aiSuggestions, preferences);
    console.log(`[AI] Returning ${Math.min(result.length, 30)} suggestions`);

    return result.slice(0, 30); // Max 30 suggestions
}

/**
 * AI tự động tạo lịch trình chi tiết theo ngày
 */
export async function generateAutoPlan({ region, days, budget, preferences, selectedLocationIds, focusLocationId }) {
    console.log(`[AI] generateAutoPlan for region="${region}", days=${days}, selectedIds=${selectedLocationIds?.length || 0}, focusId=${focusLocationId}`);

    // 1. Lấy thông tin các địa điểm đã chọn
    let selectedLocations = [];
    if (selectedLocationIds && selectedLocationIds.length > 0) {
        const rows = await prisma.locations.findMany({
            where: {
                id: { in: selectedLocationIds.map(id => BigInt(id)) }
            }
        });
        selectedLocations = rows.map(serializeLocation);
    }

    // 2. Nếu có địa điểm chính (focus), nhưng ít địa điểm khác -> Tự động tìm thêm địa điểm lân cận
    if (focusLocationId && selectedLocations.length < 10) {
        const focusLoc = selectedLocations.find(l => String(l.id) === String(focusLocationId));
        if (focusLoc) {
            console.log(`[AI] Focus location found: ${focusLoc.name}. Fetching nearby...`);
            // Tìm các địa điểm cùng Thành phố hoặc Tỉnh
            const searchArea = focusLoc.city || focusLoc.province || focusLoc.region || region;
            const nearby = await getLocationsFromDB(searchArea);
            
            // Hợp nhất và loại bỏ trùng
            const existingIds = new Set(selectedLocations.map(l => String(l.id)));
            for (const loc of nearby) {
                if (!existingIds.has(String(loc.id))) {
                    selectedLocations.push(loc);
                    existingIds.add(String(loc.id));
                }
            }
        }
    }

    // 3. Nếu vẫn chưa có đủ địa điểm hoặc trường hợp tạo mới hoàn toàn
    if (selectedLocations.length < 15) {
        const suggestions = await getSuggestions({ region, days, budget, preferences });
        // Hợp nhất
        const existingIds = new Set(selectedLocations.map(l => String(l.id)));
        for (const loc of suggestions) {
            if (!existingIds.has(String(loc.id))) {
                selectedLocations.push(loc);
                existingIds.add(String(loc.id));
            }
        }
    }

    // 4. Dùng Python AI để tổ chức lịch trình chi tiết (Gửi tối đa 30 địa điểm để AI có đủ lựa chọn ăn/ngủ/chơi)
    try {
        const payload = {
            region,
            days: Number(days) || 3,
            budget: budget ?? null,
            preferences: Array.isArray(preferences) ? preferences : [],
            focusLocationId: focusLocationId ? String(focusLocationId) : null,
            locations: selectedLocations.slice(0, 30).map((l) => ({
                id: l?.id != null ? String(l.id) : null,
                name: l?.name || "Địa điểm chưa đặt tên",
                category: l?.category || "general",
                estimatedCost: Number(l?.estimatedCost || 0),
                latitude: l?.latitude != null ? Number(l.latitude) : null,
                longitude: l?.longitude != null ? Number(l.longitude) : null,
                suggestedDuration: l?.suggestedDuration || "1-2h"
            }))
        };

        const response = await axios.post(`${PYTHON_AI_URL}/ai/organize-plan`, payload);

        if (response.data) {
            return mapPlanToLocations(response.data, selectedLocations);
        }
    } catch (err) {
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.response?.data;
        console.error("[AI] Python organize-plan error:", {
            message: err?.message,
            status,
            detail
        });
    }

    // Fallback
    console.log("[AI] Using rule-based plan as fallback");
    return generateRuleBasedPlan(selectedLocations, days || 3);
}


// ===== INTERNAL HELPERS =====

async function getLocationsFromDB(region) {
    const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM locations 
         WHERE country = 'Vietnam' 
         AND (region LIKE ? OR city LIKE ? OR province LIKE ? OR name LIKE ?)
         ORDER BY rating DESC, updated_at DESC 
         LIMIT 100`,
        `%${region}%`, `%${region}%`, `%${region}%`, `%${region}%`
    );

    return rows.map(serializeLocation);
}

async function fetchAndCacheFromGeoapify(region) {
    const geocoded = await geocodeRegionInVietnam(region);

    const features = await fetchPlacesByBbox({
        bbox: geocoded.bbox,
        categories: SUGGESTION_CATEGORIES,
        limit: 40,
        offset: 0
    });

    const locations = [];
    for (const feature of features) {
        const mapped = mapGeoapifyFeatureToLocation(feature, region);
        if (!isVietnamLocation(mapped)) continue;
        if (!mapped.external_id || !mapped.latitude || !mapped.longitude) continue;

        // Upsert into DB
        try {
            await prisma.$executeRaw`
                INSERT INTO locations (
                    external_id, source, name, address, country, province, city, district, region,
                    category, subcategory, description, latitude, longitude, geo_point,
                    estimated_cost, suggested_duration, image_url, rating, tags, raw_json
                )
                VALUES (
                    ${mapped.external_id}, ${mapped.source}, ${mapped.name}, ${mapped.address},
                    ${mapped.country}, ${mapped.province}, ${mapped.city}, ${mapped.district}, ${mapped.region},
                    ${mapped.category}, ${mapped.subcategory}, ${mapped.description},
                    ${mapped.latitude}, ${mapped.longitude}, ST_SRID(POINT(${mapped.longitude}, ${mapped.latitude}), 4326),
                    ${mapped.estimated_cost}, ${mapped.suggested_duration}, ${mapped.image_url}, ${mapped.rating},
                    CAST(${JSON.stringify(mapped.tags || [])} AS JSON),
                    CAST(${JSON.stringify(mapped.raw_json || {})} AS JSON)
                )
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    updated_at = CURRENT_TIMESTAMP
            `;
        } catch (e) {
            // Skip duplicates
        }

        locations.push({
            ...mapped,
            latitude: mapped.latitude,
            longitude: mapped.longitude
        });
    }

    return locations;
}

async function getGeminiSuggestions(region, days, budget, preferences, locations) {
    try {
        const response = await axios.post(`${PYTHON_AI_URL}/ai/rank-locations`, {
            region,
            days: days || 3,
            budget: budget || 5000000,
            preferences: preferences || [],
            locations: locations.slice(0, 30).map(l => ({
                id: l.id,
                name: l.name,
                category: l.category,
                estimatedCost: l.estimatedCost || 0
            }))
        });
        
        return response.data.rankings;
    } catch (error) {
        console.error("[AI] Error calling Python rank-locations:", error.message);
        return null;
    }
}


function mergeAISuggestions(locations, aiSuggestions, preferences) {
    if (!aiSuggestions) {
        // Fallback: score by category match
        return locations.map(loc => ({
            ...loc,
            aiScore: calculateBasicScore(loc, preferences),
            aiReason: null
        })).sort((a, b) => b.aiScore - a.aiScore);
    }

    // Map AI scores to locations
    return locations.map(loc => {
        const aiMatch = aiSuggestions.find(ai => 
            (ai.id && String(ai.id) === String(loc.id)) || 
            (ai.name && loc.name && (
                loc.name.toLowerCase().includes(ai.name.toLowerCase()) ||
                ai.name.toLowerCase().includes(loc.name.toLowerCase())
            ))
        );
        return {
            ...loc,
            aiScore: aiMatch?.score || calculateBasicScore(loc, preferences),
            aiReason: aiMatch?.reason || null
        };
    }).sort((a, b) => b.aiScore - a.aiScore);
}

function calculateBasicScore(location, preferences) {
    let score = 5; // Base

    if (location.rating) score += Number(location.rating) * 1.5;

    if (preferences?.length && location.tags) {
        const tags = Array.isArray(location.tags) ? location.tags : [];
        const category = location.category || "";
        const matchCount = preferences.filter(p =>
            tags.some(t => t.includes(p) || p.includes(t)) ||
            category.includes(p)
        ).length;
        score += matchCount * 2;
    }

    return Math.min(score, 10);
}

function generateRuleBasedPlan(locations, totalDays) {
    const itemsPerDay = Math.ceil(locations.length / totalDays);
    const days = [];

    for (let d = 0; d < totalDays; d++) {
        const dayLocations = locations.slice(d * itemsPerDay, (d + 1) * itemsPerDay);
        const items = dayLocations.map((loc, idx) => {
            const startHour = 8 + idx * 2.5;
            const endHour = startHour + 2;
            return {
                locationName: loc.name,
                locationId: loc.id,
                location: loc,
                startTime: `${Math.floor(startHour).toString().padStart(2, "0")}:${(Math.round((startHour % 1) * 60)).toString().padStart(2, "0")}`,
                endTime: `${Math.floor(endHour).toString().padStart(2, "0")}:${(Math.round((endHour % 1) * 60)).toString().padStart(2, "0")}`,
                note: loc.description || "",
                travelMinutesToNext: 15
            };
        });

        days.push({
            dayNumber: d + 1,
            title: `Ngày ${d + 1}`,
            items
        });
    }

    return {
        planName: `Kế hoạch ${totalDays} ngày`,
        description: "Lịch trình được tạo tự động",
        days
    };
}

function mapPlanToLocations(plan, locations) {
    plan.days = plan.days.map(day => ({
        ...day,
        items: day.items.map(item => {
            const matched = locations.find(l =>
                (item.locationId && String(l.id) === String(item.locationId)) ||
                (l.name && item.locationName && (
                    l.name.toLowerCase().includes(item.locationName.toLowerCase()) ||
                    item.locationName.toLowerCase().includes(l.name.toLowerCase())
                ))
            );
            return {
                ...item,
                locationId: matched?.id || null,
                location: matched || null
            };
        })
    }));
    return plan;
}

function serializeLocation(row) {
    return {
        id: row.id?.toString(),
        externalId: row.external_id,
        name: row.name,
        address: row.address,
        country: row.country,
        province: row.province,
        city: row.city,
        district: row.district,
        region: row.region,
        category: row.category,
        subcategory: row.subcategory,
        description: row.description,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        estimatedCost: row.estimated_cost,
        suggestedDuration: row.suggested_duration,
        imageUrl: row.image_url,
        rating: row.rating ? Number(row.rating) : null,
        tags: row.tags || []
    };
}
