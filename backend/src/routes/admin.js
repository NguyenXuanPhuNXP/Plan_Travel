import express from "express";
import prisma from "../config/db.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { generateLocationEmbedding, refreshSearchCache } from "../services/embeddingService.js";

const router = express.Router();

router.use(authenticate);
router.use(adminOnly);

const serializeUser = (user, extra = {}) => ({
    id: user.id?.toString(),
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.is_active,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    ...extra
});

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

const getDisplayMeta = (loc) => {
    const raw = toJsonObject(loc.raw_json);
    return toJsonObject(raw.adminDisplay);
};

const dataUrlToImageFile = async (dataUrl) => {
    const match = /^data:(image\/(?:png|jpe?g|webp|gif));base64,(.+)$/i.exec(String(dataUrl || ""));
    if (!match) {
        const error = new Error("File anh khong hop le.");
        error.status = 400;
        throw error;
    }

    const mime = match[1].toLowerCase();
    const extension = mime.includes("png")
        ? "png"
        : mime.includes("webp")
            ? "webp"
            : mime.includes("gif")
                ? "gif"
                : "jpg";
    const buffer = Buffer.from(match[2], "base64");

    if (!buffer.length || buffer.length > 8 * 1024 * 1024) {
        const error = new Error("Anh phai nho hon 8MB.");
        error.status = 400;
        throw error;
    }

    const uploadDir = path.resolve(process.cwd(), "uploads", "admin-locations");
    await fs.mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${randomUUID()}.${extension}`;
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    return `/uploads/admin-locations/${filename}`;
};

const serializeLocation = (loc) => {
    const display = getDisplayMeta(loc);
    const savedSlides = toJsonArray(display.gallerySlides);
    const gallerySlides = normalizeGallerySlides(savedSlides.length ? savedSlides : display.galleryImages, loc.name);
    return {
        id: loc.id?.toString(),
        name: loc.name,
        address: loc.address,
        region: loc.region,
        category: loc.category,
        description: loc.description,
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        imageUrl: loc.image_url,
        galleryImages: gallerySlides.map((slide) => slide.image),
        gallerySlides,
        estimatedCost: loc.estimated_cost,
        suggestedDuration: loc.suggested_duration,
        bestSeason: display.bestSeason || "Quanh năm",
        tags: toJsonArray(loc.tags),
        planCount: Number(loc.plan_count || 0)
    };
};

const serializePlan = (plan) => ({
    id: plan.id?.toString(),
    name: plan.name,
    destination: plan.destination,
    startLocation: plan.start_location,
    endLocation: plan.end_location,
    status: plan.status,
    visibility: plan.visibility,
    tripDate: plan.trip_date,
    startDate: plan.start_time,
    endDate: plan.end_time,
    totalDays: plan.total_days,
    budget: plan.budget ? Number(plan.budget) : null,
    description: plan.description,
    shareToken: plan.share_token,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at,
    owner: plan.users ? {
        id: plan.users.id?.toString(),
        fullName: plan.users.full_name,
        email: plan.users.email,
        avatarUrl: plan.users.avatar_url,
        isActive: plan.users.is_active
    } : null,
    itemCount: plan._count?.itinerary_items ?? plan.item_count ?? 0,
    collaboratorCount: plan._count?.collaborators ?? plan.collaborator_count ?? 0,
    items: plan.itinerary_items?.map((item) => ({
        id: item.id?.toString(),
        sortOrder: item.sort_order,
        note: item.note,
        startTime: item.planned_start_time,
        endTime: item.planned_end_time,
        location: item.locations ? {
            id: item.locations.id?.toString(),
            name: item.locations.name,
            address: item.locations.address,
            category: item.locations.category,
            imageUrl: item.locations.image_url
        } : null
    })) || undefined,
    collaborators: plan.collaborators?.map((member) => ({
        userId: member.user_id?.toString(),
        permission: member.permission,
        invitedAt: member.invited_at,
        user: member.users ? {
            id: member.users.id?.toString(),
            fullName: member.users.full_name,
            email: member.users.email,
            avatarUrl: member.users.avatar_url
        } : null
    })) || undefined
});

router.get("/stats", async (_req, res) => {
    try {
        const [totalUsers, totalPlans, hotLocations] = await Promise.all([
            prisma.users.count(),
            prisma.itineraries.count(),
            getHotLocations(6)
        ]);

        res.json({
            totalUsers,
            totalPlans,
            hotLocations
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Không thể tải thống kê admin." });
    }
});

router.get("/users", async (_req, res) => {
    try {
        const users = await prisma.users.findMany({
            orderBy: { created_at: "desc" },
            include: {
                _count: {
                    select: { itineraries: true }
                }
            }
        });

        res.json(users.map((user) => serializeUser(user, {
            planCount: user._count?.itineraries || 0
        })));
    } catch (error) {
        res.status(500).json({ message: error.message || "Không thể tải danh sách user." });
    }
});

router.patch("/users/:id", async (req, res) => {
    try {
        const updateData = {};
        if (req.body.isActive !== undefined) updateData.is_active = Boolean(req.body.isActive);
        if (req.body.role !== undefined) {
            if (!["user", "admin"].includes(req.body.role)) {
                return res.status(400).json({ message: "Role không hợp lệ." });
            }
            updateData.role = req.body.role;
        }
        updateData.updated_at = new Date();

        const user = await prisma.users.update({
            where: { id: BigInt(req.params.id) },
            data: updateData
        });

        res.json(serializeUser(user));
    } catch (error) {
        res.status(500).json({ message: error.message || "Không thể cập nhật user." });
    }
});

router.get("/users/:id/activity", async (req, res) => {
    try {
        const userId = BigInt(req.params.id);
        const [plans, tokens] = await Promise.all([
            prisma.itineraries.findMany({
                where: { user_id: userId },
                orderBy: { updated_at: "desc" },
                take: 20,
                select: { id: true, name: true, status: true, created_at: true, updated_at: true }
            }),
            prisma.refresh_tokens.findMany({
                where: { user_id: userId },
                orderBy: { created_at: "desc" },
                take: 10,
                select: { created_at: true, revoked_at: true, expires_at: true }
            })
        ]);

        const activities = [
            ...plans.flatMap((plan) => ([
                {
                    type: "plan_created",
                    title: `Tạo kế hoạch "${plan.name}"`,
                    at: plan.created_at,
                    meta: { id: plan.id?.toString(), status: plan.status }
                },
                {
                    type: "plan_updated",
                    title: `Cập nhật kế hoạch "${plan.name}"`,
                    at: plan.updated_at,
                    meta: { id: plan.id?.toString(), status: plan.status }
                }
            ])),
            ...tokens.map((token) => ({
                type: token.revoked_at ? "logout" : "login",
                title: token.revoked_at ? "Đăng xuất hoặc refresh token mới" : "Đăng nhập",
                at: token.revoked_at || token.created_at,
                meta: { expiresAt: token.expires_at }
            }))
        ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 30);

        res.json(activities);
    } catch (error) {
        res.status(500).json({ message: error.message || "Không thể tải lịch sử hoạt động." });
    }
});

router.get("/plans", async (req, res) => {
    try {
        const {
            keyword = "",
            status = "",
            visibility = "",
            limit = 100,
            offset = 0
        } = req.query;

        const where = {};
        const and = [];
        const keywordText = String(keyword || "").trim();

        if (keywordText) {
            and.push({
                OR: [
                    { name: { contains: keywordText } },
                    { destination: { contains: keywordText } },
                    { start_location: { contains: keywordText } },
                    { end_location: { contains: keywordText } },
                    { users: { full_name: { contains: keywordText } } },
                    { users: { email: { contains: keywordText } } }
                ]
            });
        }

        if (status) {
            where.status = String(status);
        }

        if (visibility) {
            where.visibility = String(visibility);
        }

        if (and.length) {
            where.AND = and;
        }

        const take = Math.min(Math.max(Number(limit) || 100, 1), 300);
        const skip = Math.max(Number(offset) || 0, 0);

        const [items, total] = await Promise.all([
            prisma.itineraries.findMany({
                where,
                orderBy: { updated_at: "desc" },
                take,
                skip,
                include: {
                    users: {
                        select: { id: true, full_name: true, email: true, avatar_url: true, is_active: true }
                    },
                    _count: {
                        select: { itinerary_items: true, collaborators: true }
                    }
                }
            }),
            prisma.itineraries.count({ where })
        ]);

        res.json({
            items: items.map(serializePlan),
            total,
            limit: take,
            offset: skip
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Khong the tai danh sach ke hoach." });
    }
});

router.get("/plans/:id", async (req, res) => {
    try {
        const plan = await prisma.itineraries.findUnique({
            where: { id: BigInt(req.params.id) },
            include: {
                users: {
                    select: { id: true, full_name: true, email: true, avatar_url: true, is_active: true }
                },
                itinerary_items: {
                    include: { locations: true },
                    orderBy: { sort_order: "asc" }
                },
                collaborators: {
                    include: {
                        users: {
                            select: { id: true, full_name: true, email: true, avatar_url: true }
                        }
                    },
                    orderBy: { invited_at: "asc" }
                },
                _count: {
                    select: { itinerary_items: true, collaborators: true }
                }
            }
        });

        if (!plan) {
            return res.status(404).json({ message: "Khong tim thay ke hoach." });
        }

        res.json(serializePlan(plan));
    } catch (error) {
        res.status(500).json({ message: error.message || "Khong the tai chi tiet ke hoach." });
    }
});

router.patch("/plans/:id", async (req, res) => {
    try {
        const data = {};
        if (req.body.status !== undefined) {
            if (!["draft", "generated", "completed", "cancelled"].includes(req.body.status)) {
                return res.status(400).json({ message: "Trang thai khong hop le." });
            }
            data.status = req.body.status;
        }
        if (req.body.visibility !== undefined) {
            if (!["private", "shared", "public", "public_edit"].includes(req.body.visibility)) {
                return res.status(400).json({ message: "Visibility khong hop le." });
            }
            data.visibility = req.body.visibility;
        }
        data.updated_at = new Date();

        const plan = await prisma.itineraries.update({
            where: { id: BigInt(req.params.id) },
            data,
            include: {
                users: {
                    select: { id: true, full_name: true, email: true, avatar_url: true, is_active: true }
                },
                _count: {
                    select: { itinerary_items: true, collaborators: true }
                }
            }
        });

        res.json(serializePlan(plan));
    } catch (error) {
        res.status(500).json({ message: error.message || "Khong the cap nhat ke hoach." });
    }
});

router.delete("/plans/:id", async (req, res) => {
    try {
        await prisma.itineraries.delete({
            where: { id: BigInt(req.params.id) }
        });

        res.json({ message: "Da xoa ke hoach." });
    } catch (error) {
        res.status(500).json({ message: error.message || "Khong the xoa ke hoach." });
    }
});

router.get("/locations", async (req, res) => {
    try {
        const { keyword = "", region = "", category = "", limit = 100, offset = 0 } = req.query;
        const where = [];

        if (keyword) {
            const escaped = String(keyword).replace(/'/g, "''");
            where.push(`(
                name LIKE '%${escaped}%'
                OR address LIKE '%${escaped}%'
                OR region LIKE '%${escaped}%'
                OR city LIKE '%${escaped}%'
                OR province LIKE '%${escaped}%'
                OR category LIKE '%${escaped}%'
                OR subcategory LIKE '%${escaped}%'
            )`);
        }

        if (region) {
            const escaped = String(region).replace(/'/g, "''");
            where.push(`(region LIKE '%${escaped}%' OR city LIKE '%${escaped}%' OR province LIKE '%${escaped}%')`);
        }

        if (category) {
            const escaped = String(category).replace(/'/g, "''");
            where.push(`(category LIKE '%${escaped}%' OR subcategory LIKE '%${escaped}%')`);
        }

        const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const rows = await prisma.$queryRawUnsafe(`
            SELECT l.*
            FROM locations l
            ${whereClause}
            ORDER BY l.updated_at DESC
            LIMIT ${Number(limit)} OFFSET ${Number(offset)}
        `);

        const countRows = await prisma.$queryRawUnsafe(`
            SELECT COUNT(*) AS total
            FROM locations l
            ${whereClause}
        `);

        res.json({
            items: rows.map((row) => ({
                id: row.id?.toString(),
                name: row.name,
                address: row.address,
                description: row.description,
                category: row.category,
                subcategory: row.subcategory,
                region: row.region,
                city: row.city,
                province: row.province,
                latitude: Number(row.latitude),
                longitude: Number(row.longitude),
                imageUrl: row.image_url,
                estimatedCost: row.estimated_cost,
                suggestedDuration: row.suggested_duration,
                tags: toJsonArray(row.tags)
            })),
            total: Number(countRows?.[0]?.total || 0),
            limit: Number(limit),
            offset: Number(offset)
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Không thể tải danh sách location." });
    }
});

router.get("/locations/:id", async (req, res) => {
    try {
        const locationId = BigInt(req.params.id);
        const row = await prisma.locations.findUnique({
            where: { id: locationId }
        });

        if (!row) {
            return res.status(404).json({ message: "Không tìm thấy location." });
        }

        res.json({
            id: row.id?.toString(),
            externalId: row.external_id,
            source: row.source,
            name: row.name,
            address: row.address,
            description: row.description,
            country: row.country,
            province: row.province,
            city: row.city,
            district: row.district,
            region: row.region,
            category: row.category,
            subcategory: row.subcategory,
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
            imageUrl: row.image_url,
            estimatedCost: row.estimated_cost,
            suggestedDuration: row.suggested_duration,
            rating: row.rating ? Number(row.rating) : null,
            tags: toJsonArray(row.tags),
            embedding: row.embedding
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Không thể tải chi tiết location." });
    }
});

router.post("/locations", async (req, res) => {
    try {
        const {
            name,
            address,
            description,
            category,
            subcategory,
            country = "Vietnam",
            province,
            city,
            district,
            region,
            latitude,
            longitude,
            imageUrl,
            estimatedCost = 0,
            suggestedDuration,
            tags = []
        } = req.body || {};

        if (!name || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ message: "name, latitude, longitude là bắt buộc." });
        }

        const lat = Number(latitude);
        const lng = Number(longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return res.status(400).json({ message: "latitude/longitude không hợp lệ." });
        }

        const externalId = `admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const embedding = await generateLocationEmbedding({
            name,
            address,
            description,
            category,
            subcategory,
            region,
            city,
            province,
            tags
        });

        await prisma.$executeRaw`
            INSERT INTO locations
            (
                external_id, source, name, address, description, country, province, city, district, region,
                category, subcategory, latitude, longitude, geo_point, image_url, estimated_cost, suggested_duration,
                tags, raw_json, embedding
            )
            VALUES
            (
                ${externalId}, 'admin_manual', ${name}, ${address || null}, ${description || null}, ${country}, ${province || null}, ${city || null}, ${district || null}, ${region || null},
                ${category || null}, ${subcategory || null}, ${lat}, ${lng}, ST_SRID(POINT(${lng}, ${lat}), 4326), ${imageUrl || null}, ${Number(estimatedCost) || 0}, ${suggestedDuration || null},
                CAST(${JSON.stringify(toJsonArray(tags))} AS JSON), JSON_OBJECT(), CAST(${JSON.stringify(embedding ?? [])} AS JSON)
            )
        `;
        await refreshSearchCache();

        const created = await prisma.locations.findFirst({
            where: { external_id: externalId }
        });

        res.status(201).json({
            id: created.id?.toString(),
            name: created.name
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Không thể tạo location." });
    }
});

router.patch("/locations/:id", async (req, res) => {
    try {
        const locationId = BigInt(req.params.id);
        const existing = await prisma.locations.findUnique({
            where: { id: locationId }
        });

        if (!existing) {
            return res.status(404).json({ message: "Không tìm thấy location." });
        }

        const data = {};
        const fields = [
            "name", "address", "description", "country", "province", "city", "district",
            "region", "category", "subcategory", "suggestedDuration", "imageUrl"
        ];
        fields.forEach((field) => {
            if (req.body[field] !== undefined) {
                if (field === "suggestedDuration") data.suggested_duration = req.body[field];
                else if (field === "imageUrl") data.image_url = req.body[field];
                else data[field] = req.body[field];
            }
        });

        if (req.body.latitude !== undefined) {
            const lat = Number(req.body.latitude);
            if (!Number.isFinite(lat)) return res.status(400).json({ message: "latitude không hợp lệ." });
            data.latitude = lat;
        }
        if (req.body.longitude !== undefined) {
            const lng = Number(req.body.longitude);
            if (!Number.isFinite(lng)) return res.status(400).json({ message: "longitude không hợp lệ." });
            data.longitude = lng;
        }
        if (data.latitude !== undefined || data.longitude !== undefined) {
            const finalLat = data.latitude ?? Number(existing.latitude);
            const finalLng = data.longitude ?? Number(existing.longitude);
            await prisma.$executeRaw`UPDATE locations SET geo_point = ST_SRID(POINT(${finalLng}, ${finalLat}), 4326) WHERE id = ${locationId}`;
        }

        if (req.body.estimatedCost !== undefined) data.estimated_cost = Number(req.body.estimatedCost) || 0;
        if (req.body.tags !== undefined) data.tags = toJsonArray(req.body.tags);

        const mergedForEmbedding = {
            name: data.name ?? existing.name,
            address: data.address ?? existing.address,
            description: data.description ?? existing.description,
            category: data.category ?? existing.category,
            subcategory: data.subcategory ?? existing.subcategory,
            region: data.region ?? existing.region,
            city: data.city ?? existing.city,
            province: data.province ?? existing.province,
            tags: data.tags ?? toJsonArray(existing.tags)
        };
        const embedding = await generateLocationEmbedding(mergedForEmbedding);
        data.embedding = embedding ?? [];

        data.updated_at = new Date();

        await prisma.locations.update({
            where: { id: locationId },
            data
        });

        await refreshSearchCache();

        const updated = await prisma.locations.findUnique({ where: { id: locationId } });
        res.json({
            id: updated.id?.toString(),
            name: updated.name
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Không thể cập nhật location." });
    }
});

router.delete("/locations/:id", async (req, res) => {
    try {
        const locationId = BigInt(req.params.id);

        await prisma.locations.delete({
            where: { id: locationId }
        });

        await refreshSearchCache();

        res.json({ message: "Đã xóa location." });
    } catch (error) {
        res.status(500).json({ message: error.message || "Không thể xóa location." });
    }
});

router.get("/hot-locations", async (_req, res) => {
    try {
        res.json(await getHotLocations(50));
    } catch (error) {
        res.status(500).json({ message: error.message || "Không thể tải địa điểm hot." });
    }
});

router.post("/uploads/location-image", async (req, res) => {
    try {
        const publicPath = await dataUrlToImageFile(req.body.imageDataUrl);
        const origin = `${req.protocol}://${req.get("host")}`;
        res.status(201).json({ imageUrl: `${origin}${publicPath}` });
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message || "Khong the tai anh len." });
    }
});

router.post("/hot-locations/:id", async (req, res) => {
    try {
        const locationId = BigInt(req.params.id);

        const existing = await prisma.locations.findUnique({
            where: { id: locationId },
            select: { id: true, source: true }
        });

        if (!existing) {
            return res.status(404).json({ message: "Khong tim thay dia diem." });
        }

        await prisma.locations.update({
            where: { id: locationId },
            data: {
                source: "explore_sample",
                updated_at: new Date()
            }
        });

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
            WHERE l.id = ${locationId}
            LIMIT 1
        `;

        res.json(serializeLocation(rows[0]));
    } catch (error) {
        res.status(500).json({ message: error.message || "Không thể thêm địa điểm hot." });
    }
});

router.delete("/hot-locations/:id", async (req, res) => {
    try {
        const locationId = BigInt(req.params.id);

        const existing = await prisma.locations.findUnique({
            where: { id: locationId },
            select: { id: true, source: true }
        });

        if (!existing) {
            return res.status(404).json({ message: "Khong tim thay dia diem." });
        }

        await prisma.locations.update({
            where: { id: locationId },
            data: {
                source: "admin_manual",
                updated_at: new Date()
            }
        });

        res.json({ message: "Đã xóa khỏi danh sách hot." });
    } catch (error) {
        res.status(500).json({ message: error.message || "Không thể xóa địa điểm hot." });
    }
});

router.patch("/hot-locations/:id", async (req, res) => {
    try {
        const locationId = BigInt(req.params.id);
        const existing = await prisma.locations.findUnique({
            where: { id: locationId },
            select: { raw_json: true }
        });

        if (!existing) {
            return res.status(404).json({ message: "Khong tim thay dia diem." });
        }

        const data = {};
        if (req.body.name !== undefined) data.name = req.body.name;
        if (req.body.description !== undefined) data.description = req.body.description;
        if (req.body.category !== undefined) data.category = req.body.category;
        if (req.body.imageUrl !== undefined) data.image_url = req.body.imageUrl;
        if (req.body.estimatedCost !== undefined) data.estimated_cost = Number(req.body.estimatedCost) || 0;
        if (req.body.suggestedDuration !== undefined) data.suggested_duration = req.body.suggestedDuration;
        if (req.body.tags !== undefined) data.tags = toJsonArray(req.body.tags);
        if (req.body.bestSeason !== undefined || req.body.galleryImages !== undefined || req.body.gallerySlides !== undefined) {
            const rawJson = toJsonObject(existing.raw_json);
            const displayJson = toJsonObject(rawJson.adminDisplay);
            const gallerySlides = req.body.gallerySlides !== undefined
                ? normalizeGallerySlides(req.body.gallerySlides, req.body.name || "")
                : normalizeGallerySlides(req.body.galleryImages, req.body.name || "");
            data.raw_json = {
                ...rawJson,
                adminDisplay: {
                    ...displayJson,
                    ...(req.body.bestSeason !== undefined ? { bestSeason: req.body.bestSeason } : {}),
                    ...(req.body.galleryImages !== undefined || req.body.gallerySlides !== undefined ? {
                        galleryImages: gallerySlides.map((slide) => slide.image),
                        gallerySlides
                    } : {})
                }
            };
        }
        data.updated_at = new Date();

        await prisma.locations.update({
            where: { id: locationId },
            data
        });

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
            WHERE l.id = ${locationId}
            LIMIT 1
        `;

        res.json(serializeLocation(rows[0]));
    } catch (error) {
        res.status(500).json({ message: error.message || "Không thể cập nhật địa điểm." });
    }
});

async function getHotLocations(limit = 10) {
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
        LIMIT ${Number(limit)}
    `;
    return rows.map(serializeLocation);
}

export default router;
