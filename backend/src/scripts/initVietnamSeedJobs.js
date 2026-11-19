import dotenv from "dotenv";
dotenv.config();

import prisma from "../config/db.js";
import { VIETNAM_REGIONS } from "../config/vietnamRegions.js";

async function main() {
    for (const region of VIETNAM_REGIONS) {
        await prisma.$executeRaw`
            INSERT INTO location_seed_jobs (
                region_name, job_type, status, last_page, last_offset,
                fetched_total, inserted_total, skipped_total
            )
            VALUES (${region}, 'geoapify_places', 'pending', -1, 0, 0, 0, 0)
            ON DUPLICATE KEY UPDATE region_name = VALUES(region_name)
        `;

        console.log(`Đã tạo/check job: ${region}`);
    }

    await prisma.$disconnect();
    console.log("Khởi tạo seed jobs hoàn tất");
}

main().catch(async (error) => {
    console.error("Init jobs lỗi:", error.message);
    await prisma.$disconnect();
    process.exit(1);
});