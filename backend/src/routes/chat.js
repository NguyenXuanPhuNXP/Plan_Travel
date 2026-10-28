import express from "express";
import * as chatController from "../controllers/chatController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

// Group chat routes (must be before /:friendId)
router.get("/groups", asyncHandler(chatController.getTripGroups));
router.get("/group/:itineraryId", asyncHandler(chatController.getTripGroupMessages));
router.post("/group/:itineraryId", asyncHandler(chatController.sendTripGroupMessage));

// Get messages with a specific friend
router.get("/:friendId", asyncHandler(chatController.getMessages));

// Send a message to a specific friend
router.post("/:friendId", asyncHandler(chatController.sendMessage));

// Mark messages as read
router.post("/:friendId/read", asyncHandler(chatController.markAsRead));

// Get list of recent chats
router.get("/", asyncHandler(chatController.getRecentChats));

export default router;
