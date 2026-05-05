import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import { geocodeRegionInVietnam, fetchPlacesByBbox } from "./services/geoapify.js";
import {
    mapGeoapifyFeatureToLocation,
    isVietnamLocation
} from "./services/locationMapper.js";

const app = express();

app.use(cors());
app.use(express.json());

const DEFAULT_CATEGORIES = [
    "tourism",
    "entertainment.museum",
    "catering.cafe",
    "catering.restaurant",
    "accommodation.hotel"
];

/* =========================
   TEST API
========================= */
app.get("/", (req, res) => {
    res.send("API running...");
});

/* =========================
   GET LOCATIONS
   Có hỗ trợ lọc cơ bản
========================= */
app.get("/api/locations", async (req, res) => {
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

        sql += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
        params.push(Number(limit), Number(offset));

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* =========================
   CREATE LOCATION MANUAL
========================= */
app.post("/api/locations", async (req, res) => {
    const {
        name,
        latitude,
        longitude,
        category,
        region,
        country = "Vietnam"
    } = req.body;

    try {
        const sql = `
      INSERT INTO locations
      (
        external_id, source, name, country, region, category,
        latitude, longitude, geo_point, tags, raw_json
      )
      VALUES
      (
        ?, 'manual', ?, ?, ?, ?,
        ?, ?, ST_SRID(POINT(?, ?), 4326), JSON_ARRAY(), JSON_OBJECT()
      )
    `;

        const externalId = `manual_${Date.now()}`;

        await pool.query(sql, [
            externalId,
            name,
            country,
            region || null,
            category || null,
            latitude,
            longitude,
            longitude,
            latitude
        ]);

        res.json({ message: "Created!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* =========================
   UPSERT LOCATION
========================= */
async function upsertLocation(location) {
    const sql = `
    INSERT INTO locations (
      external_id, source, name, address, country, province, city, district, region,
      category, subcategory, description, latitude, longitude, geo_point,
      estimated_cost, suggested_duration, image_url, rating, tags, raw_json
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ST_SRID(POINT(?, ?), 4326),
      ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON)
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

    await pool.query(sql, [
        location.external_id,
        location.source,
        location.name,
        location.address,
        location.country,
        location.province,
        location.city,
        location.district,
        location.region,
        location.category,
        location.subcategory,
        location.description,
        location.latitude,
        location.longitude,
        location.longitude,
        location.latitude,
        location.estimated_cost,
        location.suggested_duration,
        location.image_url,
        location.rating,
        JSON.stringify(location.tags || []),
        JSON.stringify(location.raw_json || {})
    ]);
}

/* =========================
   CACHE LOCATIONS FROM GEOAPIFY
   POST /api/locations/cache
========================= */
app.post("/api/locations/cache", async (req, res) => {
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

            // Chỉ lưu dữ liệu thuộc Việt Nam
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
test

==========================*/
app.get("/api/locations/cache", async (req, res) => {
    try {
        const region = req.query.region || "Da Nang";

        const result = await fetch("http://localhost:5000/api/locations/cache", {
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

/* =========================
   START SERVER
========================= */
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});