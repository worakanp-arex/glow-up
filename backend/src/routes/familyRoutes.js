import { Router } from "express";
import { body } from "express-validator";
import {
  inviteFamilyMember,
  acceptFamilyInvite,
  myInvitedFamily,
  revokeFamilyLink,
  listFamilyLinksForUser,
  myFamilyLinksAsFamily,
  getLinkedUserSummary,
  sendEncouragementMessage,
  requestFamilyLink,
  respondToFamilyRequest,
  listFamilyMessages,
  latestFamilyMessage,
  markFamilyMessageRead,
} from "../controllers/familyController.js";
import { familyRequestLimiter, familyInviteLimiter, familyInviteRecipientLimiter } from "../middleware/rateLimiters.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { profanityGuard } from "../services/profanityService.js";
import { emailBody, objectIdParam } from "../middleware/validators.js";

const router = Router();

router.post(
  "/invite",
  verifyToken,
  requireRole("user"),
  familyInviteLimiter,
  [emailBody()],
  validate,
  familyInviteRecipientLimiter,
  asyncHandler(inviteFamilyMember)
);
router.get("/invited", verifyToken, requireRole("user"), asyncHandler(myInvitedFamily));
router.post(
  "/request",
  verifyToken,
  requireRole("family"),
  familyRequestLimiter,
  [emailBody()],
  validate,
  asyncHandler(requestFamilyLink)
);
router.put(
  "/invited/:id/respond",
  verifyToken,
  requireRole("user"),
  [objectIdParam("id"), body("approve").isBoolean({ strict: true })],
  validate,
  asyncHandler(respondToFamilyRequest)
);
router.put(
  "/invited/:id/revoke",
  verifyToken,
  requireRole("user"),
  [objectIdParam("id")],
  validate,
  asyncHandler(revokeFamilyLink)
);

router.get(
  "/users/:userId/links",
  verifyToken,
  requireRole("admin", "counsellor"),
  [objectIdParam("userId")],
  validate,
  asyncHandler(listFamilyLinksForUser)
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
  requireRole("user", "family"),
  [objectIdParam("linkId"), body("message").trim().notEmpty().isLength({ max: 500 }), body("replyTo").optional().isMongoId()],
  validate,
  profanityGuard("message"),
  asyncHandler(sendEncouragementMessage)
);
router.get(
  "/links/:linkId/messages",
  verifyToken,
  requireRole("user", "family"),
  [objectIdParam("linkId")],
  validate,
  asyncHandler(listFamilyMessages)
);
router.get("/messages/latest", verifyToken, requireRole("user"), asyncHandler(latestFamilyMessage));
router.put(
  "/messages/:id/read",
  verifyToken,
  requireRole("user", "family"),
  [objectIdParam("id")],
  validate,
  asyncHandler(markFamilyMessageRead)
);

export default router;
