import express from "express";
import * as authController from "../controllers/authController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/refresh", asyncHandler(authController.refreshToken));
router.post("/logout", asyncHandler(authController.logout));

router.get("/me", authenticate, asyncHandler(authController.getMe));
router.patch("/profile", authenticate, asyncHandler(authController.updateProfile));
router.patch("/change-password", authenticate, asyncHandler(authController.changePassword));

export default router;
