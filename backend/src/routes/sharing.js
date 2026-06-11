import express from "express";
import * as sharingController from "../controllers/sharingController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/shared/:token", optionalAuth, asyncHandler(sharingController.getSharedItinerary));
router.put("/shared/:token", authenticate, asyncHandler(sharingController.updateSharedItinerary));
router.post("/shared/:token/items", authenticate, asyncHandler(sharingController.addSharedItem));
router.delete("/shared/:token/items/:itemId", authenticate, asyncHandler(sharingController.removeSharedItem));
router.get("/invite/:token", asyncHandler(sharingController.getGroupInviteInfo));
router.post("/invite/:token/join", authenticate, asyncHandler(sharingController.joinGroupByInvite));

router.use(authenticate);

router.post("/:id/share", asyncHandler(sharingController.shareItinerary));
router.post("/:id/invite-link", asyncHandler(sharingController.createGroupInviteLink));
router.get("/:id/collaborators", asyncHandler(sharingController.getGroupMembers));
router.post("/:id/collaborators", asyncHandler(sharingController.addCollaborator));
router.patch("/:id/collaborators/:userId", asyncHandler(sharingController.updateCollaboratorPermission));
router.delete("/:id/collaborators/:userId", asyncHandler(sharingController.removeCollaborator));
router.get("/shared-with-me", asyncHandler(sharingController.getSharedWithMe));

export default router;
