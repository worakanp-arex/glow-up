import { Router } from "express";
import { body, query } from "express-validator";
import {
  createSession,
  mySessions,
  listQueue,
  mySchedule,
  getSession,
  claimSession,
  addMessage,
  updateSchedule,
  updateStatus,
  getPatientProfile,
} from "../controllers/counsellingController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam, paginationQuery } from "../middleware/validators.js";

const router = Router();

const MOOD_VALUES = ["sad", "very_sad", "anxious", "panic", "overthinking", "angry", "stressed", "numb", "other"];

router.post(
  "/",
  verifyToken,
  requireRole("user"),
  [
    body("sessionType").isIn(["chat", "hotline", "video"]),
    body("topic").trim().notEmpty().isLength({ max: 200 }),
    body("message").trim().notEmpty().isLength({ max: 4000 }),
    body("mood").isIn(MOOD_VALUES),
    body("preferredAt").isISO8601(),
  ],
  validate,
  asyncHandler(createSession)
);
router.get("/me", verifyToken, requireRole("user"), [...paginationQuery()], validate, asyncHandler(mySessions));

router.get("/schedule/mine", verifyToken, requireRole("counsellor"), asyncHandler(mySchedule));
router.get(
  "/patients/:userId",
  verifyToken,
  requireRole("admin", "counsellor"),
  [objectIdParam("userId")],
  validate,
  asyncHandler(getPatientProfile)
);

router.get(
  "/",
  verifyToken,
  requireRole("admin", "counsellor"),
  [
    query("user").optional().isMongoId(),
    query("status").optional().isIn(["pending", "active", "scheduled", "closed", "cancelled"]),
    ...paginationQuery(),
  ],
  validate,
  asyncHandler(listQueue)
);
router.get("/:id", verifyToken, [objectIdParam("id")], validate, asyncHandler(getSession));
router.put(
  "/:id/claim",
  verifyToken,
  requireRole("counsellor"),
  [objectIdParam("id")],
  validate,
  asyncHandler(claimSession)
);
router.post(
  "/:id/messages",
  verifyToken,
  [objectIdParam("id"), body("content").trim().notEmpty().isLength({ max: 4000 })],
  validate,
  asyncHandler(addMessage)
);
router.put(
  "/:id/schedule",
  verifyToken,
  requireRole("admin", "counsellor"),
  [
    objectIdParam("id"),
    body("scheduledAt").optional().isISO8601(),
    body("meetingLink").optional().trim().notEmpty().isLength({ max: 500 }),
  ],
  validate,
  asyncHandler(updateSchedule)
);
router.put(
  "/:id/status",
  verifyToken,
  requireRole("admin", "counsellor"),
  [objectIdParam("id"), body("status").isIn(["active", "closed", "cancelled"])],
  validate,
  asyncHandler(updateStatus)
);

export default router;
