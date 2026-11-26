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
            budget: budget ?? 5000000
        }, { timeout: 60000 });
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
export async function ensureDestinationLocations(region) {
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
    return Array.from(uniqueMap.values());
}

export async function getSuggestions({ region, days, budget, preferences }) {
    const locations = await ensureDestinationLocations(region);
    if (!locations.length) throw { status: 503, message: `Chưa lấy được địa điểm thực tại ${region}. Vui lòng thử lại sau.` };

    // 4. Rank through Python service. Python handles Gemini or rule-based fallback.
    let aiSuggestions = null;
    try {
        aiSuggestions = await getGeminiSuggestions(region, days, budget, preferences, locations);
        console.log(`[AI] Python rank-locations returned ${aiSuggestions?.length || 0} scored suggestions`);
    } catch (err) {
        console.error("[AI] Python rank-locations error:", err.message);
    }

    // 5. Merge AI suggestions với location data
    const result = mergeAISuggestions(locations, aiSuggestions, preferences);
    console.log(`[AI] Returning ${Math.min(result.length, 30)} suggestions`);

    return result.slice(0, 30); // Max 30 suggestions
}

/**
 * AI tự động tạo lịch trình chi tiết theo ngày
 */
export async function generateAutoPlan({ region, days, budget, preferences, selectedLocationIds, focusLocationId, travelerCount = 1, startDate = null, endDate = null, transportMode = 'other', departureTime = '08:00', startLocation = null, maxStopsPerDay = 8 }) {
    console.log(`[AI] generateAutoPlan for region="${region}", days=${days}, selectedIds=${selectedLocationIds?.length || 0}, focusId=${focusLocationId}`);

    // 1. Lấy thông tin các địa điểm đã chọn
    const { schedulePlan } = await import('./aiPlannerEngine.js');
    let selectedLocations = [];
    const selectedLocationOrder = (Array.isArray(selectedLocationIds) ? selectedLocationIds : []).map(String);
    if (selectedLocationIds && selectedLocationIds.length > 0) {
        const rows = await prisma.locations.findMany({
            where: {
                id: { in: selectedLocationIds.map(id => BigInt(id)) }
            }
        });
        const orderIndex = new Map(selectedLocationOrder.map((id, index) => [id, index]));
        selectedLocations = rows.map(serializeLocation).sort((a, b) => {
            return (orderIndex.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER)
                - (orderIndex.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER);
        });
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
            travelerCount, startDate, endDate, transportMode, departureTime, startLocation, maxStopsPerDay,
            region,
            days: Number(days) || 3,
            budget: budget ?? null,
            preferences: Array.isArray(preferences) ? preferences : [],
            focusLocationId: focusLocationId ? String(focusLocationId) : null,
            locations: selectedLocations.slice(0, 30).map((l) => ({
                id: l?.id != null ? String(l.id) : null,
                name: l?.name || "Địa điểm chưa đặt tên",
                category: l?.category || "general",
                estimatedCost: l?.estimatedCost != null ? Number(l.estimatedCost) : null,
                latitude: l?.latitude != null ? Number(l.latitude) : null,
                longitude: l?.longitude != null ? Number(l.longitude) : null,
                suggestedDuration: l?.suggestedDuration || "1-2h",
                openingHours: l?.openingHours || null
            }))
        };

        const response = await axios.post(`${PYTHON_AI_URL}/ai/organize-plan`, payload, { timeout: 60000 });

        if (response.data) {
            const mapped = mapPlanToLocations(response.data, selectedLocations);
            mapped.focusLocationId = focusLocationId || null;
            const effectiveTransportMode = resolveTransportMode(transportMode, response.data.transport);
            const options = { days, travelerCount, departureTime, startLocation, maxStopsPerDay, transportMode: effectiveTransportMode, budget, focusLocationId, selectedLocationOrder };
            const routeDraft = schedulePlan(mapped, options);
            const routeEstimates = await buildRouteEstimates(routeDraft, { startLocation, transportMode: effectiveTransportMode });
            return { ...schedulePlan(mapped, { ...options, routeEstimates }), generationMethod: response.data.generationMethod || 'ai' };
        }
    } catch (err) {
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.response?.data;
        console.error("[AI] Python organize-plan error:", {
            url: `${PYTHON_AI_URL}/ai/organize-plan`,
            code: err?.code,
            message: err?.message || err?.cause?.message || 'Unknown request error',
            status,
            detail: detail || err?.cause?.code || null
        });
    }

    // Fallback
    console.log("[AI] Using rule-based plan as fallback");
    const fallbackPlan = generateRuleBasedPlan(selectedLocations, days || 3);
    fallbackPlan.transport = transportMode && transportMode !== 'auto'
        ? `Phương tiện theo lựa chọn của bạn: ${transportMode}. Thời gian chặng được ước tính từ vị trí địa lý; hãy xác nhận tuyến thực tế.`
        : 'Phương tiện đề xuất: taxi hoặc xe máy cho chặng nội thành; hãy xác nhận phương tiện phù hợp với từng chặng.';
    fallbackPlan.focusLocationId = focusLocationId || null;
    const effectiveTransportMode = resolveTransportMode(transportMode, fallbackPlan.transport);
    const options = { days, travelerCount, departureTime, startLocation, maxStopsPerDay, transportMode: effectiveTransportMode, budget, focusLocationId, selectedLocationOrder };
    const routeDraft = schedulePlan(fallbackPlan, options);
    const routeEstimates = await buildRouteEstimates(routeDraft, { startLocation, transportMode: effectiveTransportMode });
    return { ...schedulePlan(fallbackPlan, { ...options, routeEstimates }), generationMethod: 'rule-based' };
}

export async function recalculateGeneratedPlan({ plan, action, dayNumber, locationId, locationName, travelerCount = 1, departureTime = '08:00', startLocation = null, maxStopsPerDay = 8, transportMode = 'other', budget = null }) {
    if (!Array.isArray(plan?.days) || plan.days.length < 1 || plan.days.length > 30) {
        throw { status: 400, message: 'Lịch trình cần điều chỉnh không hợp lệ.' };
    }
    const { applyPlanAdjustment, schedulePlan } = await import('./aiPlannerEngine.js');
    let adjusted;
    try {
        adjusted = applyPlanAdjustment(plan, { action, dayNumber, locationId, locationName, maxStopsPerDay });
    } catch (error) {
        throw { status: 400, message: error.message };
    }
    const options = {
        days: adjusted.days.length,
        travelerCount,
        departureTime,
        startLocation,
        maxStopsPerDay,
        transportMode,
        budget,
        focusLocationId: plan.focusLocationId || null
    };
    const routeDraft = schedulePlan(adjusted, options);
    const routeEstimates = await buildRouteEstimates(routeDraft, { startLocation, transportMode });
    return {
        ...schedulePlan(adjusted, {
            ...options,
            routeEstimates
        }),
        generationMethod: plan.generationMethod || 'ai',
        adjustmentApplied: action
    };
}


// ===== INTERNAL HELPERS =====

async function getLocationsFromDB(region) {
    const searchPattern = `%${region || ''}%`;
    const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM locations 
         WHERE (country = 'Vietnam' OR country IS NULL) 
         AND (region LIKE ? OR city LIKE ? OR province LIKE ? OR name LIKE ? OR address LIKE ?)
         ORDER BY rating DESC, updated_at DESC 
         LIMIT 100`,
        searchPattern, searchPattern, searchPattern, searchPattern, searchPattern
    );

    return (rows || []).map(serializeLocation);
}

function resolveTransportMode(requestedMode, suggestion = '') {
    if (requestedMode && requestedMode !== 'auto') return requestedMode;
    const recommendation = String(suggestion || '').toLowerCase();
    if (/đi bộ|walking|walk/.test(recommendation)) return 'other';
    if (/xe máy|motorbike|scooter/.test(recommendation)) return 'motorbike';
    if (/xe khách|coach|bus/.test(recommendation)) return 'coach';
    if (/tàu hỏa|tàu hoả|đường sắt|train/.test(recommendation)) return 'train';
    if (/máy bay|flight|hàng không/.test(recommendation)) return 'flight';
    if (/taxi|ô tô|ô-tô|xe hơi|car/.test(recommendation)) return 'car';
    return 'auto';
}

async function buildRouteEstimates(plan, { startLocation = null, transportMode = 'auto' } = {}) {
    if (!process.env.GEOAPIFY_API_KEY) return {};
    const pairs = [];
    const { isAccommodationItem } = await import('./aiPlannerEngine.js');
    for (const [dayIndex, day] of (plan?.days || []).entries()) {
        const previousDay = dayIndex > 0 ? plan.days[dayIndex - 1] : null;
        const previousStay = previousDay?.items?.slice().reverse().find(isAccommodationItem);
        const previousLocation = previousStay ? (previousStay.location || previousStay) : previousDay?.items?.at(-1)?.location || null;
        let previous = dayIndex === 0 ? startLocation : previousLocation;
        for (const item of day.items || []) {
            if (item.scheduleConflict) continue;
            const location = item.location || item;
            if (previous && location) pairs.push([previous, location]);
            previous = location;
        }
    }
    const uniquePairs = [...new Map(pairs
        .filter(([from, to]) => routeEstimateKey(from, to))
        .map(([from, to]) => [routeEstimateKey(from, to), [from, to]])).values()].slice(0, 80);
    const resolved = await Promise.all(uniquePairs.map(async ([from, to]) => {
        try {
            const { fetchRouteEstimate } = await import('./geoapify.js');
            const estimate = await fetchRouteEstimate(from, to, transportMode);
            return estimate ? [routeEstimateKey(from, to), estimate] : null;
        } catch (error) {
            console.warn('[AI] Routing API unavailable; using Haversine fallback:', error?.message || error);
            return null;
        }
    }));
    return Object.fromEntries(resolved.filter(Boolean));
}

function routeEstimateKey(from, to) {
    const point = (value) => {
        const rawLatitude = value?.latitude ?? value?.lat;
        const rawLongitude = value?.longitude ?? value?.lng;
        if (rawLatitude == null || rawLatitude === '' || rawLongitude == null || rawLongitude === '') return null;
        const latitude = Number(rawLatitude);
        const longitude = Number(rawLongitude);
        return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
            && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
            ? `${latitude.toFixed(6)},${longitude.toFixed(6)}`
            : null;
    };
    const fromKey = point(from);
    const toKey = point(to);
    return fromKey && toKey ? `${fromKey}>${toKey}` : null;
}

async function fetchAndCacheFromGeoapify(region) {
    const geocoded = await geocodeRegionInVietnam(region);

    const features = await fetchPlacesByBbox({
        bbox: geocoded.bbox,
        center: geocoded.center,
        categories: SUGGESTION_CATEGORIES,
        limit: 40,
        offset: 0
    });

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

    }

    return getLocationsFromDB(region);
}

async function getGeminiSuggestions(region, days, budget, preferences, locations) {
    try {
        const response = await axios.post(`${PYTHON_AI_URL}/ai/rank-locations`, {
            region,
            days: days || 3,
            budget: budget ?? 5000000,
            preferences: preferences || [],
            locations: locations.slice(0, 30).map(l => ({
                id: l.id != null ? String(l.id) : null,
                name: l.name,
                category: l.category,
                estimatedCost: l.estimatedCost ?? null
            }))
        }, { timeout: 15000 });
        
        return response.data.rankings;
    } catch (error) {
        console.error("[AI] Error calling Python rank-locations:", {
            url: `${PYTHON_AI_URL}/ai/rank-locations`,
            code: error?.code,
            message: error?.message || error?.cause?.message || 'Unknown request error',
            status: error?.response?.status,
            detail: error?.response?.data?.detail || error?.response?.data || error?.cause?.code || null
        });
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
    const itemsPerDay = Math.max(1, Math.ceil(locations.length / (totalDays || 1)));
    const days = [];

    for (let d = 0; d < totalDays; d++) {
        const dayLocations = locations.slice(d * itemsPerDay, (d + 1) * itemsPerDay);
        const items = dayLocations.map((loc, idx) => {
            const slotMinutes = Math.min(150, Math.floor(14 * 60 / Math.max(1, dayLocations.length)));
            const startMinutes = 8 * 60 + idx * slotMinutes;
            const durationMinutes = Math.max(1, slotMinutes - 15);
            const endMinutes = startMinutes + durationMinutes;
            const clock = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
            return {
                locationName: loc.name,
                locationId: loc.id,
                location: loc,
                startTime: clock(startMinutes),
                endTime: clock(endMinutes),
                durationMinutes,
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
        estimatedCost: row.estimated_cost != null && Number(row.estimated_cost) > 0 ? Number(row.estimated_cost) : null,
        suggestedDuration: row.suggested_duration,
        imageUrl: row.image_url,
        rating: row.rating ? Number(row.rating) : null,
        tags: row.tags || [],
        openingHours: serializeOpeningHours(row.raw_json)
    };
}

function serializeOpeningHours(rawJson) {
    const value = rawJson?.properties?.opening_hours || rawJson?.properties?.openingHours || rawJson?.opening_hours || rawJson?.openingHours;
    if (!value) return null;
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); } catch { return null; }
}
