import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { getSuggestions, generateAutoPlan } from "../services/aiSuggestionService.js";

const router = express.Router();

router.use(authenticate);

/**
 * POST /api/suggestions/destinations
 * Gợi ý địa điểm dựa trên region + preferences
 */
router.post("/destinations", async (req, res) => {
    try {
        const { region, days, budget, preferences } = req.body;

        if (!region) {
            return res.status(400).json({ message: "Vui lòng nhập địa điểm." });
        }

        const suggestions = await getSuggestions({
            region,
            days: days || null,
            budget: budget || null,
            preferences: preferences || []
        });

        res.json({
            region,
            total: suggestions.length,
            suggestions
        });
    } catch (error) {
        console.error("Suggestions error:", error);
        res.status(500).json({ message: error.message || "Lỗi khi tìm gợi ý." });
    }
});

/**
 * POST /api/suggestions/auto-plan
 * Tự động tạo lịch trình theo ngày
 */
router.post("/auto-plan", async (req, res) => {
    try {
        const { region, days, budget, preferences, selectedLocationIds } = req.body;

        if (!region) {
            return res.status(400).json({ message: "Vui lòng nhập địa điểm." });
        }

        const plan = await generateAutoPlan({
            region,
            days: days || 3,
            budget: budget || null,
            preferences: preferences || [],
            selectedLocationIds: selectedLocationIds || []
        });

        res.json(plan);
    } catch (error) {
        console.error("Auto-plan error:", error);
        res.status(500).json({ message: error.message || "Lỗi khi tạo lịch trình." });
    }
});

export default router;
