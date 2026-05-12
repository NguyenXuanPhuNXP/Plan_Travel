import express from "express";
import prisma from "../config/db.js";
import { geocodeRegionInVietnam, fetchPlacesByBbox } from "../services/geoapify.js";
import {
    mapGeoapifyFeatureToLocation,
    isVietnamLocation
} from "../services/locationMapper.js";

const router = express.Router();

const DEFAULT_CATEGORIES = [
    "tourism",
    "entertainment.museum",
    "catering.cafe",
    "catering.restaurant",
    "accommodation.hotel"
];

/* =========================
   GET LOCATIONS
   Có hỗ trợ lọc cơ bản
========================= */
router.get("/", async (req, res) => {
    try {
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
        
        // Prisma raw query because of dynamic SQL and JSON_CONTAINS
        const rows = await prisma.$queryRawUnsafe(sql, ...params);
        
        // Convert BigInt to string/number for JSON serialization
        const serializedRows = rows.map(row => {
            return {
                ...row,
                id: row.id ? row.id.toString() : row.id
            }
        });

        res.json(serializedRows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* =========================
   CREATE LOCATION MANUAL
========================= */
router.post("/", async (req, res) => {
    const {
        name,
        latitude,
        longitude,
        category,
        region,
        country = "Vietnam"
    } = req.body;

    try {
        const externalId = `manual_${Date.now()}`;

        await prisma.$executeRaw`
            INSERT INTO locations
            (
                external_id, source, name, country, region, category,
                latitude, longitude, geo_point, tags, raw_json
            )
            VALUES
            (
                ${externalId}, 'manual', ${name}, ${country}, ${region || null}, ${category || null},
                ${latitude}, ${longitude}, ST_SRID(POINT(${longitude}, ${latitude}), 4326), JSON_ARRAY(), JSON_OBJECT()
            )
        `;

        res.json({ message: "Created!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* =========================
   UPSERT LOCATION
========================= */
async function upsertLocation(location) {
    await prisma.$executeRaw`
        INSERT INTO locations (
            external_id, source, name, address, country, province, city, district, region,
            category, subcategory, description, latitude, longitude, geo_point,
            estimated_cost, suggested_duration, image_url, rating, tags, raw_json
        )
        VALUES (
            ${location.external_id}, ${location.source}, ${location.name}, ${location.address}, ${location.country}, ${location.province}, ${location.city}, ${location.district}, ${location.region},
            ${location.category}, ${location.subcategory}, ${location.description}, ${location.latitude}, ${location.longitude}, ST_SRID(POINT(${location.longitude}, ${location.latitude}), 4326),
            ${location.estimated_cost}, ${location.suggested_duration}, ${location.image_url}, ${location.rating}, CAST(${JSON.stringify(location.tags || [])} AS JSON), CAST(${JSON.stringify(location.raw_json || {})} AS JSON)
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
            updated_at = CURRENT_TIMESTAMP
    `;
}

/* =========================
   CACHE LOCATIONS FROM GEOAPIFY
========================= */
router.post("/cache", async (req, res) => {
    try {
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
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ========================
   TEST CACHE ENDPOINT
==========================*/
router.get("/cache", async (req, res) => {
    try {
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

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ========================
   DESTINATION STATS
   Đếm số lượng itineraries theo destination
========================== */
router.get("/destination-stats", async (req, res) => {
    try {
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
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
