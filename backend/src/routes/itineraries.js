import express from "express";
import * as itineraryController from "../controllers/itineraryController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

router.post("/", asyncHandler(itineraryController.createItinerary));
router.get("/", asyncHandler(itineraryController.getUserItineraries));
router.get("/:id", asyncHandler(itineraryController.getItineraryById));
router.put("/:id", asyncHandler(itineraryController.updateItinerary));
router.delete("/:id", asyncHandler(itineraryController.deleteItinerary));

router.post("/:id/items", asyncHandler(itineraryController.addItem));
router.put("/:id/items/:itemId", asyncHandler(itineraryController.updateItem));
router.delete("/:id/items/:itemId", asyncHandler(itineraryController.removeItem));
router.put("/:id/reorder", asyncHandler(itineraryController.reorderItems));

export default router;
