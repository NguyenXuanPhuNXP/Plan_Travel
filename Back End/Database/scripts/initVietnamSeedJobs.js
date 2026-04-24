import dotenv from "dotenv";
dotenv.config({ path: "./Database/.env" });

import { pool } from "../db.js";
import { VIETNAM_REGIONS } from "../config/vietnamRegions.js";

async function main() {
    for (const region of VIETNAM_REGIONS) {
        await pool.query(
            `
        INSERT INTO location_seed_jobs (
          region_name, job_type, status, last_page, last_offset,
          fetched_total, inserted_total, skipped_total
        )
        VALUES (?, 'geoapify_places', 'pending', -1, 0, 0, 0, 0)
        ON DUPLICATE KEY UPDATE region_name = VALUES(region_name)
      `,
            [region]
        );

        console.log(`Đã tạo/check job: ${region}`);
    }

    await pool.end();
    console.log("Khởi tạo seed jobs hoàn tất");
}

main().catch(async (error) => {
    console.error("Init jobs lỗi:", error.message);
    await pool.end();
    process.exit(1);
});