import express from "express";
import * as chatController from "../controllers/chatController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, userOnly } from "../middleware/authMiddleware.js";
import * as chatService from '../services/chatService.js';

const router = express.Router();

router.use(authenticate, userOnly);
router.get('/group/:itineraryId/messages', asyncHandler(async (req, res) => res.json(await chatService.getTripGroupMessages(req.params.itineraryId, req.user.id, req.query))));
router.get('/:friendId/messages', asyncHandler(async (req, res) => res.json(await chatService.getMessages(req.user.id, req.params.friendId, req.query))));

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
