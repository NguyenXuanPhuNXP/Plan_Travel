import express from "express";
import * as itineraryController from "../controllers/itineraryController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Packing catalog (accessible as reference catalog, must be before /:id)
router.get("/packing-catalog", optionalAuth, asyncHandler(itineraryController.getPackingCatalog));

router.use(authenticate);

// Itinerary CRUD
router.post("/", asyncHandler(itineraryController.createItinerary));
router.get("/", asyncHandler(itineraryController.getUserItineraries));
router.get("/:id", asyncHandler(itineraryController.getItineraryById));
router.put("/:id", asyncHandler(itineraryController.updateItinerary));
router.delete("/:id", asyncHandler(itineraryController.deleteItinerary));

// Item routes
router.post("/:id/items", asyncHandler(itineraryController.addItem));
router.put("/:id/items/:itemId", asyncHandler(itineraryController.updateItem));
router.delete("/:id/items/:itemId", asyncHandler(itineraryController.removeItem));
router.put("/:id/reorder", asyncHandler(itineraryController.reorderItems));

// Packing checklist routes
router.post("/:id/packing", asyncHandler(itineraryController.addPackingItem));
router.put("/:id/packing/:packingId", asyncHandler(itineraryController.updatePackingItem));
router.delete("/:id/packing/:packingId", asyncHandler(itineraryController.removePackingItem));

export default router;
