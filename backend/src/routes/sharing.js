import express from "express";
import { authenticate, optionalAuth } from "../middleware/authMiddleware.js";
import {
    shareItinerary,
    getSharedItinerary,
    getSharedItineraryWithPermission,
    updateSharedItinerary,
    addSharedItem,
    removeSharedItem,
    addCollaborator,
    removeCollaborator,
    getSharedWithMe
} from "../services/sharingService.js";

const router = express.Router();

/**
 * GET /api/sharing/shared/:token - Public access (không cần auth, nhưng nếu có auth sẽ trả permission)
 */
router.get("/shared/:token", optionalAuth, async (req, res) => {
    try {
        let result;
        if (req.user?.id) {
            result = await getSharedItineraryWithPermission(req.params.token, req.user.id);
        } else {
            result = await getSharedItinerary(req.params.token);
        }
        if (!result) return res.status(404).json({ message: "Lịch trình không tồn tại hoặc là riêng tư." });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

/**
 * PUT /api/sharing/shared/:token - Cập nhật itinerary qua share token (cần đăng nhập + permission edit)
 */
router.put("/shared/:token", authenticate, async (req, res) => {
    try {
        const result = await updateSharedItinerary(req.params.token, req.user.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

/**
 * POST /api/sharing/shared/:token/items - Thêm item qua share token
 */
router.post("/shared/:token/items", authenticate, async (req, res) => {
    try {
        const result = await addSharedItem(req.params.token, req.user.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

/**
 * DELETE /api/sharing/shared/:token/items/:itemId - Xóa item qua share token
 */
router.delete("/shared/:token/items/:itemId", authenticate, async (req, res) => {
    try {
        await removeSharedItem(req.params.token, req.user.id, req.params.itemId);
        res.json({ message: "Đã xóa." });
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

// Các routes bên dưới cần auth
router.use(authenticate);

/**
 * POST /api/sharing/:id/share - Tạo share link
 */
router.post("/:id/share", async (req, res) => {
    try {
        const result = await shareItinerary(req.params.id, req.user.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

/**
 * POST /api/sharing/:id/collaborators - Mời collaborator
 */
router.post("/:id/collaborators", async (req, res) => {
    try {
        const result = await addCollaborator(req.params.id, req.user.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

/**
 * DELETE /api/sharing/:id/collaborators/:userId - Xóa collaborator
 */
router.delete("/:id/collaborators/:userId", async (req, res) => {
    try {
        await removeCollaborator(req.params.id, req.user.id, req.params.userId);
        res.json({ message: "Đã xóa." });
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

/**
 * GET /api/sharing/shared-with-me - Plans được chia sẻ với user
 */
router.get("/shared-with-me", async (req, res) => {
    try {
        const result = await getSharedWithMe(req.user.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

export default router;
