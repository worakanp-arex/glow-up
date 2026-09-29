import { Router } from "express";
import { body } from "express-validator";
import {
  inviteFamilyMember,
  acceptFamilyInvite,
  myInvitedFamily,
  revokeFamilyLink,
  myFamilyLinksAsFamily,
  getLinkedUserSummary,
  sendEncouragementMessage,
} from "../controllers/familyController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam } from "../middleware/validators.js";

const router = Router();

router.post(
  "/invite",
  verifyToken,
  requireRole("user"),
  [body("email").isEmail().normalizeEmail()],
  validate,
  asyncHandler(inviteFamilyMember)
);
router.get("/invited", verifyToken, requireRole("user"), asyncHandler(myInvitedFamily));
router.put(
  "/invited/:id/revoke",
  verifyToken,
  requireRole("user"),
  [objectIdParam("id")],
  validate,
  asyncHandler(revokeFamilyLink)
);

router.post(
  "/accept",
  verifyToken,
  requireRole("user", "family"),
  [body("email").isEmail().normalizeEmail(), body("token").trim().notEmpty()],
  validate,
  asyncHandler(acceptFamilyInvite)
);
router.get("/links", verifyToken, requireRole("user", "family"), asyncHandler(myFamilyLinksAsFamily));
router.get(
  "/links/:linkId/summary",
  verifyToken,
  requireRole("user", "family"),
  [objectIdParam("linkId")],
  validate,
  asyncHandler(getLinkedUserSummary)
);
router.post(
  "/links/:linkId/messages",
  verifyToken,
  requireRole("family"),
  [objectIdParam("linkId"), body("message").trim().notEmpty().isLength({ max: 500 })],
  validate,
  asyncHandler(sendEncouragementMessage)
);

export default router;
