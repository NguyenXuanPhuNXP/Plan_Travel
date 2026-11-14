import dotenv from "dotenv";
dotenv.config();

import prisma from "../config/db.js";

const exploreSamples = [
    {
        slug: "da-lat",
        name: "Đà Lạt",
        address: "Đà Lạt, Lâm Đồng, Việt Nam",
        province: "Lâm Đồng",
        region: "Đà Lạt",
        latitude: 11.9404,
        longitude: 108.4583,
        estimatedCost: 3500000,
        suggestedDuration: "3-4 ngày",
        bestSeason: "Tháng 11 - Tháng 3",
        imageUrl: "https://images.unsplash.com/photo-1597147715206-df6ff44955b2?auto=format&fit=crop&q=80&w=1200",
        tags: ["nature", "photography", "relax"],
        description: "Thành phố ngàn hoa với khí hậu mát mẻ, hồ nước, đồi thông và nhiều góc nghỉ dưỡng nhẹ nhàng."
    },
    {
        slug: "nha-trang",
        name: "Nha Trang",
        address: "Nha Trang, Khánh Hòa, Việt Nam",
        province: "Khánh Hòa",
        region: "Nha Trang",
        latitude: 12.2388,
        longitude: 109.1967,
        estimatedCost: 4500000,
        suggestedDuration: "3-4 ngày",
        bestSeason: "Tháng 1 - Tháng 8",
        imageUrl: "https://images.unsplash.com/photo-1559628233-100c798642d4?auto=format&fit=crop&q=80&w=1200",
        tags: ["beach", "nightlife", "adventure"],
        description: "Thành phố biển sôi động với vịnh xanh, đảo gần bờ, hải sản và nhiều hoạt động ngoài trời."
    },
    {
        slug: "vung-tau",
        name: "Vũng Tàu",
        address: "Vũng Tàu, Bà Rịa - Vũng Tàu, Việt Nam",
        province: "Bà Rịa - Vũng Tàu",
        region: "Vũng Tàu",
        latitude: 10.346,
        longitude: 107.0843,
        estimatedCost: 2500000,
        suggestedDuration: "2-3 ngày",
        bestSeason: "Tháng 11 - Tháng 4",
        imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200",
        tags: ["beach", "food", "relax"],
        description: "Điểm nghỉ cuối tuần gần miền Nam với bãi biển, hải đăng, Bạch Dinh và hải sản."
    },
    {
        slug: "da-nang",
        name: "Đà Nẵng",
        address: "Đà Nẵng, Việt Nam",
        province: "Đà Nẵng",
        region: "Đà Nẵng",
        latitude: 16.0544,
        longitude: 108.2022,
        estimatedCost: 5000000,
        suggestedDuration: "3-5 ngày",
        bestSeason: "Tháng 2 - Tháng 8",
        imageUrl: "https://images.unsplash.com/photo-1559592443-7f87a79f6528?auto=format&fit=crop&q=80&w=1200",
        tags: ["beach", "culture", "food"],
        description: "Thành phố biển miền Trung kết nối thuận tiện với Cầu Vàng, Ngũ Hành Sơn và ẩm thực phong phú."
    },
    {
        slug: "hoi-an",
        name: "Hội An",
        address: "Hội An, Quảng Nam, Việt Nam",
        province: "Quảng Nam",
        region: "Hội An",
        latitude: 15.8801,
        longitude: 108.338,
        estimatedCost: 3000000,
        suggestedDuration: "2-3 ngày",
        bestSeason: "Tháng 2 - Tháng 7",
        imageUrl: "https://images.unsplash.com/photo-1563823251939-b9989d1e219a?auto=format&fit=crop&q=80&w=1200",
        tags: ["culture", "food", "photography"],
        description: "Phố cổ đèn lồng với kiến trúc di sản, làng nghề, món ăn đường phố và nhịp đi bộ thư thả."
    },
    {
        slug: "phu-quoc",
        name: "Phú Quốc",
        address: "Phú Quốc, Kiên Giang, Việt Nam",
        province: "Kiên Giang",
        region: "Phú Quốc",
        latitude: 10.227,
        longitude: 103.9591,
        estimatedCost: 7000000,
        suggestedDuration: "4-5 ngày",
        bestSeason: "Tháng 11 - Tháng 4",
        imageUrl: "https://images.unsplash.com/photo-1589779202405-b778c8eec974?auto=format&fit=crop&q=80&w=1200",
        tags: ["beach", "relax", "adventure"],
        description: "Đảo nghỉ dưỡng với bãi cát sáng, điểm lặn ngắm biển, chợ đêm và các chuyến đi đảo."
    },
    {
        slug: "sa-pa",
        name: "Sa Pa",
        address: "Sa Pa, Lào Cai, Việt Nam",
        province: "Lào Cai",
        region: "Sa Pa",
        latitude: 22.3363,
        longitude: 103.8438,
        estimatedCost: 4000000,
        suggestedDuration: "3-4 ngày",
        bestSeason: "Tháng 9 - Tháng 11",
        imageUrl: "https://images.unsplash.com/photo-1570366583862-f91883984fde?auto=format&fit=crop&q=80&w=1200",
        tags: ["mountain", "nature", "culture", "adventure"],
        description: "Vùng núi Tây Bắc với ruộng bậc thang, bản làng, Fansipan và những cung đường ngắm mây."
    },
    {
        slug: "ha-long",
        name: "Hạ Long",
        address: "Hạ Long, Quảng Ninh, Việt Nam",
        province: "Quảng Ninh",
        region: "Hạ Long",
        latitude: 20.9101,
        longitude: 107.1839,
        estimatedCost: 5500000,
        suggestedDuration: "2-3 ngày",
        bestSeason: "Tháng 3 - Tháng 5",
        imageUrl: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&q=80&w=1200",
        tags: ["nature", "adventure", "relax"],
        description: "Vịnh đảo đá vôi nổi bật với du thuyền, hang động, góc ngắm cảnh và hành trình trên nước."
    }
];

const commonsFile = (filename) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=1440`;

const onlineGalleryBySlug = {
    "da-lat": [
        { name: "Hồ Xuân Hương", image: commonsFile("Dalat-wiki.jpg") },
        { name: "Nông trại Đà Lạt", image: commonsFile("Farm land in Da Lat, Vietnam.JPG") }
    ],
    "nha-trang": [
        { name: "Bãi biển Nha Trang", image: commonsFile("Beach Nha Trang.jpg") },
        { name: "Vịnh Nha Trang", image: commonsFile("Bờ biển ở Nha Trang.jpg") }
    ],
    "vung-tau": [
        { name: "Bãi biển Vũng Tàu", image: commonsFile("Vung Tau.jpg") },
        { name: "Tượng Phật Vũng Tàu", image: commonsFile("Buddha in Vung Tau.JPG") }
    ],
    "da-nang": [
        { name: "Cầu Vàng", image: commonsFile("Golden Bridge, Da Nang (I).jpg") },
        { name: "Bà Nà Hills", image: commonsFile("Da Nang Golden Bridge Banner.jpg") }
    ],
    "hoi-an": [
        { name: "Phố đèn lồng Hội An", image: commonsFile("Hoi An lanterns.jpg") },
        { name: "Đèn lồng Hội An", image: commonsFile("Den long Hoi An 3.JPG") }
    ],
    "phu-quoc": [
        { name: "Biển Phú Quốc", image: commonsFile("Phu Quoc.jpg") },
        { name: "Hoàng hôn Phú Quốc", image: commonsFile("Sunset at Phu Quoc.jpg") }
    ],
    "sa-pa": [
        { name: "Ruộng bậc thang Sa Pa", image: commonsFile("Terraced fields Sa Pa Vietnam.JPG") },
        { name: "Thung lũng Sa Pa", image: commonsFile("Sa Pa Rice Terrace I.jpg") }
    ],
    "ha-long": [
        { name: "Vịnh Hạ Long", image: commonsFile("Ha long bay.jpg") },
        { name: "Hòn Trống Mái", image: commonsFile("Vietnam, Ha Long Bay, Kissing Rocks.jpg") }
    ]
};

async function upsertSample(sample) {
    const rawJson = JSON.stringify({
        sample: true,
        adminDisplay: {
            bestSeason: sample.bestSeason,
            galleryImages: [sample.imageUrl, ...(onlineGalleryBySlug[sample.slug] || []).map((slide) => slide.image)],
            gallerySlides: [
                { name: sample.name, image: sample.imageUrl },
                ...(onlineGalleryBySlug[sample.slug] || [])
            ]
        }
    });

    await prisma.$executeRaw`
        INSERT INTO locations (
            external_id, source, name, address, country, province, city, region,
            category, subcategory, description, latitude, longitude, geo_point,
            estimated_cost, suggested_duration, image_url, tags, raw_json, updated_at
        )
        VALUES (
            ${`explore_sample_${sample.slug}`}, 'explore_sample', ${sample.name}, ${sample.address}, 'Vietnam',
            ${sample.province}, ${sample.region}, ${sample.region},
            'tourism', 'destination', ${sample.description}, ${sample.latitude}, ${sample.longitude},
            ST_SRID(POINT(${sample.longitude}, ${sample.latitude}), 4326),
            ${sample.estimatedCost}, ${sample.suggestedDuration}, ${sample.imageUrl},
            CAST(${JSON.stringify(sample.tags)} AS JSON), CAST(${rawJson} AS JSON), CURRENT_TIMESTAMP
        )
        ON DUPLICATE KEY UPDATE
            source = VALUES(source),
            name = VALUES(name),
            address = VALUES(address),
            country = VALUES(country),
            province = VALUES(province),
            city = VALUES(city),
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
            tags = VALUES(tags),
            raw_json = VALUES(raw_json),
            updated_at = CURRENT_TIMESTAMP
    `;
}

async function main() {
    for (const sample of exploreSamples) {
        await upsertSample(sample);
    }

    console.log(`Seeded ${exploreSamples.length} explore sample destinations.`);
    await prisma.$disconnect();
}

main().catch(async (error) => {
    console.error("Explore sample seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
});
