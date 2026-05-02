import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../config/db.js";
import { geocodeRegionInVietnam, fetchPlacesByBbox } from "./geoapify.js";
import { mapGeoapifyFeatureToLocation, isVietnamLocation } from "./locationMapper.js";

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
    // 1. Tìm trong DB trước (đã cache)
    let locations = await getLocationsFromDB(region);

    // 2. Nếu DB ít data → fetch từ Geoapify và cache
    if (locations.length < 10) {
        try {
            const fetched = await fetchAndCacheFromGeoapify(region);
            locations = [...locations, ...fetched];
        } catch (err) {
            console.error("Geoapify fetch error:", err.message);
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
    try {
        aiSuggestions = await getGeminiSuggestions(region, days, budget, preferences, locations);
    } catch (err) {
        console.error("Gemini AI error:", err.message);
    }

    // 5. Merge AI suggestions với location data
    const result = mergeAISuggestions(locations, aiSuggestions, preferences);

    return result.slice(0, 30); // Max 30 suggestions
}

/**
 * AI tự động tạo lịch trình chi tiết theo ngày
 */
export async function generateAutoPlan({ region, days, budget, preferences, selectedLocationIds }) {
    // Lấy selected locations from DB
    let selectedLocations = [];
    if (selectedLocationIds && selectedLocationIds.length > 0) {
        const rows = await prisma.locations.findMany({
            where: {
                id: { in: selectedLocationIds.map(id => BigInt(id)) }
            }
        });
        selectedLocations = rows.map(serializeLocation);
    }

    // Nếu chưa có selected, lấy suggestions
    if (selectedLocations.length === 0) {
        selectedLocations = await getSuggestions({ region, days, budget, preferences });
        selectedLocations = selectedLocations.slice(0, days ? days * 4 : 12);
    }

    // Dùng Gemini để tạo plan chi tiết
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // Fallback: rule-based plan
        return generateRuleBasedPlan(selectedLocations, days || 3);
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const locationList = selectedLocations.map(l =>
            `- ${l.name} (${l.category || "general"}, lat: ${l.latitude}, lng: ${l.longitude}, cost: ${l.estimatedCost || 0}đ, duration: ${l.suggestedDuration || "1-2h"})`
        ).join("\n");

        const prompt = `Bạn là chuyên gia du lịch Việt Nam. Hãy tạo lịch trình du lịch chi tiết.

Thông tin:
- Địa điểm: ${region}
- Số ngày: ${days || 3}
- Ngân sách: ${budget ? budget.toLocaleString() + " VNĐ" : "Không giới hạn"}
- Sở thích: ${preferences?.join(", ") || "Đa dạng"}

Danh sách địa điểm có sẵn:
${locationList}

Hãy trả về JSON (chỉ JSON, không markdown) theo format:
{
  "planName": "Tên gợi ý cho lịch trình",
  "description": "Mô tả ngắn",
  "days": [
    {
      "dayNumber": 1,
      "title": "Tiêu đề ngày",
      "items": [
        {
          "locationName": "Tên địa điểm (phải trùng khớp danh sách trên)",
          "startTime": "08:00",
          "endTime": "10:00",
          "note": "Gợi ý cho du khách",
          "travelMinutesToNext": 15
        }
      ]
    }
  ]
}

Lưu ý:
- Sắp xếp các địa điểm gần nhau trong cùng ngày
- Buổi sáng bắt đầu 7-8h, kết thúc khoảng 20-21h
- Xen kẽ tham quan và ăn uống hợp lý
- Nếu có budget, ưu tiên địa điểm phù hợp`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Parse JSON từ response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const plan = JSON.parse(jsonMatch[0]);

            // Map locationName → actual location data
            return mapPlanToLocations(plan, selectedLocations);
        }
    } catch (err) {
        console.error("Gemini plan generation error:", err.message);
    }

    // Fallback
    return generateRuleBasedPlan(selectedLocations, days || 3);
}

// ===== INTERNAL HELPERS =====

async function getLocationsFromDB(region) {
    const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM locations 
         WHERE country = 'Vietnam' 
         AND (region LIKE ? OR city LIKE ? OR province LIKE ? OR name LIKE ?)
         ORDER BY rating DESC, updated_at DESC 
         LIMIT 50`,
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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const locationNames = locations.slice(0, 30).map(l =>
        `${l.name} (${l.category || "general"}, cost: ~${l.estimatedCost || 0}đ)`
    ).join(", ");

    const prompt = `Bạn là chuyên gia du lịch Việt Nam. Đánh giá và xếp hạng các địa điểm sau cho chuyến đi ${region}${days ? ` ${days} ngày` : ""}${budget ? `, ngân sách ${budget}đ` : ""}${preferences?.length ? `, sở thích: ${preferences.join(", ")}` : ""}.

Danh sách: ${locationNames}

Trả về JSON array (chỉ JSON):
[{"name": "tên địa điểm", "score": 1-10, "reason": "lý do ngắn gọn"}]
Sắp xếp theo score giảm dần.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }
    return null;
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
            ai.name && loc.name && (
                loc.name.toLowerCase().includes(ai.name.toLowerCase()) ||
                ai.name.toLowerCase().includes(loc.name.toLowerCase())
            )
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
                startTime: `${Math.floor(startHour).toString().padStart(2, "0")}:${(startHour % 1 * 60).toString().padStart(2, "0")}`,
                endTime: `${Math.floor(endHour).toString().padStart(2, "0")}:00`,
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
                l.name && item.locationName && (
                    l.name.toLowerCase().includes(item.locationName.toLowerCase()) ||
                    item.locationName.toLowerCase().includes(l.name.toLowerCase())
                )
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
