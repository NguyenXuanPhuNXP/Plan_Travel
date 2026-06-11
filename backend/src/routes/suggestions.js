import express from "express";
import * as suggestionController from "../controllers/suggestionController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

router.post("/destinations", asyncHandler(suggestionController.getDestinationSuggestions));
router.post("/auto-plan", asyncHandler(suggestionController.createAutoPlan));

export default router;
