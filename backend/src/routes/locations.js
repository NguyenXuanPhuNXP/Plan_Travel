import express from "express";
import * as locationController from "../controllers/locationController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, userOnly } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

router.get("/", asyncHandler(locationController.listLocations));
router.post("/", authenticate, userOnly, rateLimit({ limit: 30, windowMs: 60000 }), asyncHandler(locationController.createManualLocation));
router.post("/cache", authenticate, adminOnly, rateLimit({ limit: 5, windowMs: 60000 }), asyncHandler(locationController.cacheLocations));
router.post("/ensure", authenticate, userOnly, rateLimit({ limit: 10, windowMs: 60000 }), asyncHandler(locationController.ensureDestinationCatalog));
router.get('/cache', (_req, res) => res.status(405).set('Allow', 'POST').json({ code: 'METHOD_NOT_ALLOWED', message: 'Dùng POST và tài khoản admin để nạp cache.' }));
router.get("/destination-stats", asyncHandler(locationController.getDestinationStats));
router.get("/hot", asyncHandler(locationController.getHotLocations));
router.get("/:id", asyncHandler(locationController.getLocationById));

export default router;
