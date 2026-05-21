import express from "express";
import {
    register,
    login,
    refreshToken,
    logout,
    getUserProfile,
    updateUserProfile,
    changePassword
} from "../services/authService.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const response = await register(req.body);
        res.status(200).json(response);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({
            message: error.message || "Lỗi máy chủ nội bộ.",
            details: error.details
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const response = await login(req.body);
        res.status(200).json(response);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({
            message: error.message || "Lỗi máy chủ nội bộ.",
            details: error.details
        });
    }
});

router.post("/refresh", async (req, res) => {
    try {
        if (!req.body.refreshToken) {
            return res.status(400).json({ message: "Thiếu refresh token." });
        }
        const response = await refreshToken(req.body.refreshToken);
        res.status(200).json(response);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({
            message: error.message || "Lỗi máy chủ nội bộ.",
            details: error.details
        });
    }
});

router.post("/logout", async (req, res) => {
    try {
        if (!req.body.refreshToken) {
            return res.status(400).json({ message: "Thiếu refresh token." });
        }
        await logout(req.body.refreshToken);
        res.status(200).json({ message: "Đăng xuất thành công." });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({
            message: error.message || "Lỗi máy chủ nội bộ.",
            details: error.details
        });
    }
});

router.get("/me", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const userProfile = await getUserProfile(userId);

        if (!userProfile) {
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        res.status(200).json(userProfile);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({
            message: error.message || "Lỗi máy chủ nội bộ.",
            details: error.details
        });
    }
});

router.patch("/profile", authenticate, async (req, res) => {
    try {
        res.status(200).json(await updateUserProfile(req.user.id, req.body));
    } catch (error) {
        res.status(error.status || 500).json({
            message: error.message || "Lỗi máy chủ nội bộ.",
            details: error.details
        });
    }
});

router.patch("/change-password", authenticate, async (req, res) => {
    try {
        res.status(200).json(await changePassword(req.user.id, req.body));
    } catch (error) {
        res.status(error.status || 500).json({
            message: error.message || "Lỗi máy chủ nội bộ.",
            details: error.details
        });
    }
});

export default router;
