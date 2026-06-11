import express from "express";
import * as friendController from "../controllers/friendController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/", asyncHandler(friendController.getFriends));
router.get("/search", asyncHandler(friendController.searchUsers));
router.post("/request", asyncHandler(friendController.sendFriendRequest));
router.post("/accept/:id", asyncHandler(friendController.acceptFriendRequest));
router.post("/reject/:id", asyncHandler(friendController.rejectFriendRequest));
router.delete("/:id", asyncHandler(friendController.removeFriend));
router.get("/notifications", asyncHandler(friendController.getNotifications));
router.post("/notifications/read", asyncHandler(friendController.markNotificationsRead));

export default router;
