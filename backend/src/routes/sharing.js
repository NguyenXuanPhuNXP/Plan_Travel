import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
    shareItinerary,
    getSharedItinerary,
    addCollaborator,
    removeCollaborator,
    getSharedWithMe
} from "../services/sharingService.js";

const router = express.Router();

/**
 * GET /api/sharing/shared/:token - Public access (không cần auth)
 */
router.get("/shared/:token", async (req, res) => {
    try {
        const result = await getSharedItinerary(req.params.token);
        if (!result) return res.status(404).json({ message: "Lịch trình không tồn tại hoặc là riêng tư." });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message || "Lỗi máy chủ." });
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
