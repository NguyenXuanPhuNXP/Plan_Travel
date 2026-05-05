import dotenv from "dotenv";
dotenv.config({ path: "./Database/.env" });

import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import { geocodeRegionInVietnam, fetchPlacesByBbox } from "./services/geoapifyService.js";
import { mapGeoapifyFeatureToLocation } from "./services/locationMapper.js";

const DEFAULT_REGION = "Da Nang";
const DEFAULT_CATEGORIES = [
    "tourism",
    "entertainment.museum",
    "catering.cafe",
    "catering.restaurant",
    "accommodation.hotel"
];
const DEFAULT_LIMIT = 100;

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

async function main() {
    const region = process.argv[2] || DEFAULT_REGION;

    console.log(`Bắt đầu seed dữ liệu cho khu vực: ${region}`);

    const geocoded = await geocodeRegionInVietnam(region);

    const features = await fetchPlacesByBbox({
        bbox: geocoded.bbox,
        categories: DEFAULT_CATEGORIES,
        limit: DEFAULT_LIMIT,
        offset: 0
    });

    let count = 0;
    let skipped = 0;

    for (const feature of features) {
        const mapped = mapGeoapifyFeatureToLocation(feature, region);

        if (!isVietnamLocation(mapped)) {
            skipped++;
            continue;
        }

        if (!mapped.external_id || !mapped.latitude || !mapped.longitude) {
            skipped++;
            continue;
        }

        await upsertLocation(mapped);
        count++;
    }

    console.log(`Seed xong. insertedOrUpdated=${count}, skipped=${skipped}`);
    await pool.end();
}

main().catch(async (error) => {
    console.error("Seed lỗi:", error.message);
    await pool.end();
    process.exit(1);
});