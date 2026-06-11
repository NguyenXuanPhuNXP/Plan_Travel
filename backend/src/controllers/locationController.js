import prisma from "../config/db.js";
import { geocodeRegionInVietnam, fetchPlacesByBbox } from "../services/geoapify.js";
import {
    mapGeoapifyFeatureToLocation,
    isVietnamLocation
} from "../services/locationMapper.js";
import { generateLocationEmbedding, refreshSearchCache } from "../services/embeddingService.js";

const DEFAULT_CATEGORIES = [
    "tourism",
    "entertainment.museum",
    "catering.cafe",
    "catering.restaurant",
    "accommodation.hotel"
];

const toJsonObject = (value) => {
    if (!value) return {};
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
        } catch {
            return {};
        }
    }
    return typeof value === "object" && !Array.isArray(value) ? value : {};
};

const toJsonArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return value.split(",").map((item) => item.trim()).filter(Boolean);
        }
    }
    return [];
};

const normalizeGallerySlides = (value, fallbackName = "") => toJsonArray(value)
    .map((slide) => {
        if (typeof slide === "string") {
            return { image: slide, name: fallbackName };
        }

        const item = toJsonObject(slide);
        const image = String(item.image || item.imageUrl || item.url || "").trim();
        if (!image) return null;

        return {
            image,
            name: String(item.name || fallbackName || "").trim()
        };
    })
    .filter(Boolean);

const serializeLocation = (loc) => {
    const rawJson = toJsonObject(loc.raw_json);
    const display = toJsonObject(rawJson.adminDisplay);
    const savedSlides = toJsonArray(display.gallerySlides);
    const gallerySlides = normalizeGallerySlides(savedSlides.length ? savedSlides : display.galleryImages, loc.name);
    return {
        id: loc.id?.toString(),
        name: loc.name,
        description: loc.description,
        address: loc.address,
        country: loc.country,
        province: loc.province,
        city: loc.city,
        district: loc.district,
        region: loc.region,
        category: loc.category,
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        imageUrl: loc.image_url,
        image_url: loc.image_url,
        galleryImages: gallerySlides.map((slide) => slide.image),
        gallerySlides,
        estimatedCost: loc.estimated_cost,
        estimated_cost: loc.estimated_cost,
        suggestedDuration: loc.suggested_duration,
        suggested_duration: loc.suggested_duration,
        rating: loc.rating ? Number(loc.rating) : null,
        bestSeason: display.bestSeason || "Quanh năm",
        tags: toJsonArray(loc.tags),
        planCount: Number(loc.plan_count || 0)
    };
};

export async function listLocations(req, res) {
    const { region, category, tag, limit = 100, offset = 0 } = req.query;

    let sql = "SELECT * FROM locations WHERE country = 'Vietnam'";
    const params = [];

    if (region) {
        sql += " AND (region = ? OR city = ? OR province = ?)";
        params.push(region, region, region);
    }

    if (category) {
        sql += " AND category LIKE ?";
        params.push(`${category}%`);
    }

    if (tag) {
        sql += " AND JSON_CONTAINS(tags, JSON_QUOTE(?))";
        params.push(tag);
    }

    sql += ` ORDER BY updated_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

    const rows = await prisma.$queryRawUnsafe(sql, ...params);
    res.json(rows.map(serializeLocation));
}

export async function createManualLocation(req, res) {
    const {
        name,
        address,
        latitude,
        longitude,
        category,
        region,
        country = "Vietnam",
        imageUrl,
        estimatedCost = 0,
        suggestedDuration
    } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
        throw { status: 400, message: "name, latitude and longitude are required" };
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw { status: 400, message: "latitude and longitude must be valid numbers" };
    }

    const externalId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const embedding = await generateLocationEmbedding({
        name,
        address,
        country,
        region,
        category,
        latitude: lat,
        longitude: lng
    });

    await prisma.$executeRaw`
        INSERT INTO locations
        (
            external_id, source, name, address, country, region, category,
            latitude, longitude, geo_point, estimated_cost, suggested_duration, image_url, tags, raw_json, embedding
        )
        VALUES
        (
            ${externalId}, 'manual', ${name}, ${address || null}, ${country}, ${region || null}, ${category || null},
            ${lat}, ${lng}, ST_SRID(POINT(${lng}, ${lat}), 4326), ${Number(estimatedCost) || 0}, ${suggestedDuration || null}, ${imageUrl || null}, JSON_ARRAY(), JSON_OBJECT(),
            CAST(${JSON.stringify(embedding ?? [])} AS JSON)
        )
    `;
    await refreshSearchCache();

    const rows = await prisma.$queryRaw`
        SELECT id, name, address, country, region, category, latitude, longitude, estimated_cost, suggested_duration, image_url
        FROM locations
        WHERE external_id = ${externalId}
        LIMIT 1
    `;
    const created = rows?.[0];

    res.status(201).json({
        id: created.id?.toString(),
        name: created.name,
        address: created.address,
        country: created.country,
        region: created.region,
        category: created.category,
        latitude: Number(created.latitude),
        longitude: Number(created.longitude),
        estimatedCost: created.estimated_cost,
        suggestedDuration: created.suggested_duration,
        imageUrl: created.image_url
    });
}

export async function cacheLocations(req, res) {
    const {
        region = "Da Nang",
        categories = DEFAULT_CATEGORIES,
        limit = 50
    } = req.body;

    const geocoded = await geocodeRegionInVietnam(region);

    const features = await fetchPlacesByBbox({
        bbox: geocoded.bbox,
        categories,
        limit: Number(limit),
        offset: 0
    });

    let insertedOrUpdated = 0;
    let skipped = 0;

    for (const feature of features) {
        const mapped = mapGeoapifyFeatureToLocation(feature, region);

        if (!isVietnamLocation(mapped)) {
            skipped += 1;
            continue;
        }

        if (!mapped.external_id || !mapped.latitude || !mapped.longitude) {
            skipped += 1;
            continue;
        }

        await upsertLocation(mapped);
        insertedOrUpdated += 1;
    }

    res.json({
        message: "Cache completed",
        region,
        categories,
        totalFetched: features.length,
        insertedOrUpdated,
        skipped
    });
}

export async function testCacheLocations(req, res) {
    const region = req.query.region || "Da Nang";

    const result = await fetch(`http://localhost:${process.env.PORT || 5000}/api/locations/cache`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ region })
    });

    const data = await result.json();
    res.json(data);
}

export async function getDestinationStats(_req, res) {
    const rows = await prisma.$queryRawUnsafe(
        `SELECT destination, COUNT(*) as plan_count
         FROM itineraries
         WHERE destination IS NOT NULL AND destination != ''
         GROUP BY destination
         ORDER BY plan_count DESC
         LIMIT 50`
    );

    const stats = {};
    for (const row of rows) {
        stats[row.destination] = Number(row.plan_count);
    }

    res.json(stats);
}

export async function getHotLocations(req, res) {
    const limit = Math.min(Number(req.query.limit || 10), 50);
    const rows = await prisma.$queryRaw`
        SELECT l.*,
               COALESCE(pc.plan_count, 0) AS plan_count
        FROM locations l
        LEFT JOIN (
            SELECT location_id, COUNT(*) AS plan_count
            FROM itinerary_items
            WHERE location_id IS NOT NULL
            GROUP BY location_id
        ) pc ON pc.location_id = l.id
        WHERE l.source = 'explore_sample'
        ORDER BY plan_count DESC, l.updated_at DESC
        LIMIT ${limit}
    `;

    res.json(rows.map(serializeLocation));
}

export async function getLocationById(req, res) {
    if (!/^\d+$/.test(String(req.params.id))) {
        throw { status: 400, message: "Invalid location id" };
    }

    const rows = await prisma.$queryRaw`
        SELECT id, name, address, country, province, city, district, region, category,
               latitude, longitude, estimated_cost, suggested_duration, image_url, rating, tags, raw_json
        FROM locations
        WHERE id = ${BigInt(req.params.id)}
        LIMIT 1
    `;

    const loc = rows?.[0];
    if (!loc) {
        throw { status: 404, message: "Location not found" };
    }

    res.json(serializeLocation(loc));
}

async function upsertLocation(location) {
    const embedding = await generateLocationEmbedding(location);

    await prisma.$executeRaw`
        INSERT INTO locations (
            external_id, source, name, address, country, province, city, district, region,
            category, subcategory, description, latitude, longitude, geo_point,
            estimated_cost, suggested_duration, image_url, rating, tags, raw_json, embedding
        )
        VALUES (
            ${location.external_id}, ${location.source}, ${location.name}, ${location.address}, ${location.country}, ${location.province}, ${location.city}, ${location.district}, ${location.region},
            ${location.category}, ${location.subcategory}, ${location.description}, ${location.latitude}, ${location.longitude}, ST_SRID(POINT(${location.longitude}, ${location.latitude}), 4326),
            ${location.estimated_cost}, ${location.suggested_duration}, ${location.image_url}, ${location.rating}, CAST(${JSON.stringify(location.tags || [])} AS JSON), CAST(${JSON.stringify(location.raw_json || {})} AS JSON), CAST(${JSON.stringify(embedding ?? [])} AS JSON)
        )
        ON DUPLICATE KEY UPDATE
            source = VALUES(source),
            name = VALUES(name),
            address = VALUES(address),
            country = VALUES(country),
            province = VALUES(province),
            city = VALUES(city),
            district = VALUES(district),
            region = VALUES(region),
            category = VALUES(category),
            subcategory = VALUES(subcategory),
            description = VALUES(description),
            latitude = VALUES(latitude),
            longitude = VALUES(longitude),
            geo_point = VALUES(geo_point),
            estimated_cost = VALUES(estimated_cost),
            suggested_duration = VALUES(suggested_duration),
            image_url = VALUES(image_url),
            rating = VALUES(rating),
            tags = VALUES(tags),
            raw_json = VALUES(raw_json),
            embedding = VALUES(embedding),
            updated_at = CURRENT_TIMESTAMP
    `;
    await refreshSearchCache();
}
