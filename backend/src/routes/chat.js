import express from "express";
import * as chatController from "../controllers/chatController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

// Get messages with a specific friend
router.get("/:friendId", asyncHandler(chatController.getMessages));

// Send a message to a specific friend
router.post("/:friendId", asyncHandler(chatController.sendMessage));

// Mark messages as read
router.post("/:friendId/read", asyncHandler(chatController.markAsRead));

// Get list of recent chats (optional)
router.get("/", asyncHandler(chatController.getRecentChats));

export default router;
