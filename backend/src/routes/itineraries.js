import express from "express";
import * as itineraryController from "../controllers/itineraryController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

// Packing catalog (must be before /:id)
router.get("/packing-catalog", asyncHandler(itineraryController.getPackingCatalog));

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
