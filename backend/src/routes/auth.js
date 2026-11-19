import express from "express";
import * as authController from "../controllers/authController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/authMiddleware.js";

import prisma from '../config/db.js';
import { createAuthResponse } from '../services/authService.js';
import { createGoogleAuth } from '../services/googleAuthService.js';

const router = express.Router();
const googleAuth = createGoogleAuth({ prisma, createSession: createAuthResponse });

router.get('/google/challenge', (_req, res, next) => {
    try { res.set('Cache-Control', 'no-store').json(googleAuth.challenge()); }
    catch (error) { next(error); }
});
router.post('/google', asyncHandler(async (req, res) => {
    // GIS callback uses JSON fetch; reject cross-origin login submissions.
    const allowedOrigins = (process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173')
        .split(',').map(value => value.trim());
    if (!allowedOrigins.includes(req.get('origin'))) {
        throw { status: 403, message: 'Nguồn đăng nhập Google không hợp lệ.' };
    }
    res.set('Cache-Control', 'no-store').json(await googleAuth.login(req.body));
}));

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/refresh", asyncHandler(authController.refreshToken));
router.post("/logout", asyncHandler(authController.logout));

router.get("/me", authenticate, asyncHandler(authController.getMe));
router.patch("/profile", authenticate, asyncHandler(authController.updateProfile));
router.patch("/change-password", authenticate, asyncHandler(authController.changePassword));

export default router;
