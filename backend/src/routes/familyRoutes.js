import { Router } from "express";
import {
  inviteFamilyMember,
  acceptFamilyInvite,
  myInvitedFamily,
  revokeFamilyLink,
  myFamilyLinksAsFamily,
  getLinkedUserSummary,
} from "../controllers/familyController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.post("/invite", verifyToken, requireRole("user"), asyncHandler(inviteFamilyMember));
router.get("/invited", verifyToken, requireRole("user"), asyncHandler(myInvitedFamily));
router.put("/invited/:id/revoke", verifyToken, requireRole("user"), asyncHandler(revokeFamilyLink));

router.post("/accept", verifyToken, asyncHandler(acceptFamilyInvite));
router.get("/links", verifyToken, asyncHandler(myFamilyLinksAsFamily));
router.get("/links/:linkId/summary", verifyToken, asyncHandler(getLinkedUserSummary));

export default router;
