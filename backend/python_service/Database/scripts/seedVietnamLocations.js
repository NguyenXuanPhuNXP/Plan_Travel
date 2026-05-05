import dotenv from "dotenv";
dotenv.config({ path: "./Database/.env" });

import { pool } from "../db.js";
import { geocodeRegionInVietnam, fetchPlacesByBbox } from "../services/geoapify.js";
import {
    mapGeoapifyFeatureToLocation,
    isVietnamLocation
} from "../services/locationMapper.js";
import { VIETNAM_REGIONS } from "../config/vietnamRegions.js";
import {
    getOrCreateSeedJob,
    markJobRunning,
    updateJobProgress,
    markJobDone,
    markJobFailed
} from "../services/seedJobService.js";

const DEFAULT_CATEGORIES = [
    "tourism",
    "entertainment.museum",
    "catering.cafe",
    "catering.restaurant",
    "accommodation.hotel"
];

const PAGE_LIMIT = 100;
const MAX_PAGES_PER_REGION = 20;
const DELAY_MS = 400;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function seedRegion(regionName) {
    console.log(`\n=== Seed khu vực: ${regionName} ===`);

    const job = await getOrCreateSeedJob(regionName);

    if (job.status === "done") {
        console.log(`Bỏ qua ${regionName} vì đã done`);
        return {
            regionName,
            fetchedTotal: job.fetched_total,
            insertedOrUpdated: job.inserted_total,
            skipped: job.skipped_total,
            skippedBecauseDone: true
        };
    }

    await markJobRunning(regionName);

    const geocoded = await geocodeRegionInVietnam(regionName);

    let fetchedTotal = Number(job.fetched_total || 0);
    let insertedOrUpdated = Number(job.inserted_total || 0);
    let skipped = Number(job.skipped_total || 0);

    // last_page = -1 nghĩa là chưa chạy page nào
    const startPage = Number(job.last_page || -1) + 1;

    for (let page = startPage; page < MAX_PAGES_PER_REGION; page++) {
        const offset = page * PAGE_LIMIT;

        const features = await fetchPlacesByBbox({
            bbox: geocoded.bbox,
            categories: DEFAULT_CATEGORIES,
            limit: PAGE_LIMIT,
            offset
        });

        if (!features.length) {
            console.log(`Không còn dữ liệu ở page ${page + 1}`);

            await markJobDone(regionName, {
                lastPage: page - 1,
                lastOffset: page > 0 ? (page - 1) * PAGE_LIMIT : 0,
                fetchedTotal,
                insertedTotal: insertedOrUpdated,
                skippedTotal: skipped
            });

            break;
        }

        fetchedTotal += features.length;

        for (const feature of features) {
            const mapped = mapGeoapifyFeatureToLocation(feature, regionName);

            if (!isVietnamLocation(mapped)) {
                skipped++;
                continue;
            }

            if (!mapped.external_id || !mapped.latitude || !mapped.longitude) {
                skipped++;
                continue;
            }

            await upsertLocation(mapped);
            insertedOrUpdated++;
        }

        await updateJobProgress(regionName, {
            lastPage: page,
            lastOffset: offset,
            fetchedTotal,
            insertedTotal: insertedOrUpdated,
            skippedTotal: skipped
        });

        console.log(
            `resume_page=${page + 1}, fetched=${features.length}, insertedOrUpdated=${insertedOrUpdated}, skipped=${skipped}`
        );

        if (features.length < PAGE_LIMIT) {
            await markJobDone(regionName, {
                lastPage: page,
                lastOffset: offset,
                fetchedTotal,
                insertedTotal: insertedOrUpdated,
                skippedTotal: skipped
            });
            break;
        }

        await sleep(DELAY_MS);
    }

    return {
        regionName,
        fetchedTotal,
        insertedOrUpdated,
        skipped,
        skippedBecauseDone: false
    };
}

async function main() {
    const onlyRegion = process.argv[2];
    const regions = onlyRegion ? [onlyRegion] : VIETNAM_REGIONS;

    let totalFetched = 0;
    let totalInsertedOrUpdated = 0;
    let totalSkipped = 0;
    let totalDoneSkipped = 0;

    for (const region of regions) {
        try {
            const result = await seedRegion(region);

            if (result.skippedBecauseDone) {
                totalDoneSkipped++;
            }

            totalFetched += result.fetchedTotal || 0;
            totalInsertedOrUpdated += result.insertedOrUpdated || 0;
            totalSkipped += result.skipped || 0;
        } catch (error) {
            console.error(`Lỗi khu vực ${region}:`, error.message);
            await markJobFailed(region, error.message);
        }

        await sleep(DELAY_MS);
    }

    console.log("\n=== HOÀN TẤT ===");
    console.log("totalFetched =", totalFetched);
    console.log("totalInsertedOrUpdated =", totalInsertedOrUpdated);
    console.log("totalSkipped =", totalSkipped);
    console.log("alreadyDoneSkipped =", totalDoneSkipped);

    await pool.end();
}

main().catch(async (error) => {
    console.error("Seed lỗi:", error.message);
    await pool.end();
    process.exit(1);
});