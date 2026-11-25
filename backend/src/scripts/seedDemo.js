import prisma from '../config/db.js';
import bcrypt from 'bcryptjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Explicit local development fixtures; never reset existing passwords/profiles.
const database = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)) {
    throw new Error('Demo seed is restricted to a local database.');
}

try {
    const accounts = [
        ['admin@plantravel.com', 'Quản Trị Viên', 'admin', 'admin123456'],
        ['an.nguyen.traveler@gmail.com', 'Nguyễn Văn An', 'user', 'travel123456'],
        ['linh.le.wanderlust@gmail.com', 'Lê Hoàng Linh', 'user', 'travel123456']
    ];
    for (const [email, full_name, role, password] of accounts) {
        await prisma.users.upsert({
            where: { email }, update: {},
            create: { email, full_name, role, password_hash: await bcrypt.hash(password, 10), is_active: true }
        });
    }
    const places = [
        ['ho-hoan-kiem', 'Hồ Hoàn Kiếm', 21.0285, 105.8542],
        ['van-mieu', 'Văn Miếu - Quốc Tử Giám', 21.0273, 105.8355],
        ['ho-tay', 'Hồ Tây', 21.0583, 105.8245],
        ['chua-tran-quoc', 'Chùa Trấn Quốc', 21.0477, 105.8367],
        ['nha-hat-lon', 'Nhà hát Lớn Hà Nội', 21.0242, 105.8572],
        ['bao-tang-dan-toc-hoc', 'Bảo tàng Dân tộc học', 21.0402, 105.7980],
        ['hoang-thanh', 'Hoàng thành Thăng Long', 21.0352, 105.8403],
        ['cau-long-bien', 'Cầu Long Biên', 21.0457, 105.8597]
    ];
    for (const [slug, name, latitude, longitude] of places) {
        const externalId = `demo_${slug}`;
        await prisma.$executeRaw`
            INSERT INTO locations (external_id, source, name, address, country, province, city, region,
                category, latitude, longitude, geo_point, estimated_cost, suggested_duration)
            VALUES (${externalId}, 'demo', ${name}, 'Hà Nội, Việt Nam', 'Vietnam', 'Hà Nội', 'Hà Nội', 'Hà Nội',
                'tourism', ${latitude}, ${longitude}, ST_SRID(POINT(${longitude}, ${latitude}), 4326), 50000, '1-2 giờ')
            ON DUPLICATE KEY UPDATE external_id = VALUES(external_id)`;
    }
    execFileSync(process.execPath, [fileURLToPath(new URL('./seedExploreSamples.js', import.meta.url))], { stdio: 'inherit' });
    console.log('Local demo seed complete:', {
        users: await prisma.users.count(), locations: await prisma.locations.count(),
        packingItems: await prisma.packing_items.count()
    });
} finally {
    await prisma.$disconnect();
}
