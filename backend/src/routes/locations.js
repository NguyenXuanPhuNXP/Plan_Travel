import express from "express";
import * as locationController from "../controllers/locationController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.get("/", asyncHandler(locationController.listLocations));
router.post("/", asyncHandler(locationController.createManualLocation));
router.post("/cache", asyncHandler(locationController.cacheLocations));
router.get("/cache", asyncHandler(locationController.testCacheLocations));
router.get("/destination-stats", asyncHandler(locationController.getDestinationStats));
router.get("/hot", asyncHandler(locationController.getHotLocations));
router.get("/:id", asyncHandler(locationController.getLocationById));

export default router;
