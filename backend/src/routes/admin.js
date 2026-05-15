import express from "express";
import prisma from "../config/db.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);
router.use((req, res, next) => {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Bạn không có quyền truy cập trang quản trị." });
    }
    next();
});

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

const serializeLocation = (loc) => ({
    id: loc.id?.toString(),
    name: loc.name,
    address: loc.address,
    region: loc.region,
    category: loc.category,
    description: loc.description,
    latitude: Number(loc.latitude),
    longitude: Number(loc.longitude),
    imageUrl: loc.image_url,
    estimatedCost: loc.estimated_cost,
    suggestedDuration: loc.suggested_duration,
    planCount: Number(loc.plan_count || 0)
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

router.get("/hot-locations", async (_req, res) => {
    try {
        res.json(await getHotLocations(50));
    } catch (error) {
        res.status(500).json({ message: error.message || "Không thể tải địa điểm hot." });
    }
});

router.patch("/hot-locations/:id", async (req, res) => {
    try {
        const data = {};
        if (req.body.name !== undefined) data.name = req.body.name;
        if (req.body.description !== undefined) data.description = req.body.description;
        if (req.body.category !== undefined) data.category = req.body.category;
        if (req.body.imageUrl !== undefined) data.image_url = req.body.imageUrl;
        if (req.body.estimatedCost !== undefined) data.estimated_cost = Number(req.body.estimatedCost) || 0;
        if (req.body.suggestedDuration !== undefined) data.suggested_duration = req.body.suggestedDuration;
        data.updated_at = new Date();

        const updated = await prisma.locations.update({
            where: { id: BigInt(req.params.id) },
            data
        });

        res.json(serializeLocation({ ...updated, plan_count: 0 }));
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
        ORDER BY plan_count DESC, l.updated_at DESC
        LIMIT ${Number(limit)}
    `;
    return rows.map(serializeLocation);
}

export default router;
