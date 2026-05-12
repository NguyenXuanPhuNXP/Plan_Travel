import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
    createItinerary,
    getUserItineraries,
    getItineraryById,
    updateItinerary,
    deleteItinerary,
    addItem,
    updateItem,
    removeItem,
    reorderItems
} from "../services/itineraryService.js";

const router = express.Router();

// Tất cả routes đều cần auth
router.use(authenticate);

/* =========================
   CRUD ITINERARIES
========================= */

// Tạo itinerary mới
router.post("/", async (req, res) => {
    try {
        const result = await createItinerary(req.user.id, req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

// Lấy tất cả itineraries của user
router.get("/", async (req, res) => {
    try {
        const result = await getUserItineraries(req.user.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

// Lấy chi tiết 1 itinerary
router.get("/:id", async (req, res) => {
    try {
        const result = await getItineraryById(req.params.id, req.user.id);
        if (!result) return res.status(404).json({ message: "Không tìm thấy." });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

// Cập nhật itinerary
router.put("/:id", async (req, res) => {
    try {
        const result = await updateItinerary(req.params.id, req.user.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

// Xóa itinerary
router.delete("/:id", async (req, res) => {
    try {
        await deleteItinerary(req.params.id, req.user.id);
        res.json({ message: "Đã xóa lịch trình." });
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

/* =========================
   ITINERARY ITEMS
========================= */

// Thêm item
router.post("/:id/items", async (req, res) => {
    try {
        const result = await addItem(req.params.id, req.user.id, req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

// Cập nhật item
router.put("/:id/items/:itemId", async (req, res) => {
    try {
        const result = await updateItem(req.params.id, req.params.itemId, req.user.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

// Xóa item
router.delete("/:id/items/:itemId", async (req, res) => {
    try {
        await removeItem(req.params.id, req.params.itemId, req.user.id);
        res.json({ message: "Đã xóa địa điểm." });
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

// Reorder items
router.put("/:id/reorder", async (req, res) => {
    try {
        await reorderItems(req.params.id, req.user.id, req.body.orderedItemIds);
        res.json({ message: "Đã sắp xếp lại." });
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message || "Lỗi máy chủ." });
    }
});

export default router;
