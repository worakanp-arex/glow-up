import { Router } from "express";
import { body } from "express-validator";
import {
  createEmotionLog,
  myEmotionLogs,
  myEmotionStreak,
  userEmotionLogs,
  userEmotionStreak,
} from "../controllers/emotionController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam } from "../middleware/validators.js";

const router = Router();

router.post(
  "/",
  verifyToken,
  requireRole("user"),
  [
    body("happinessLevel").isInt({ min: 1, max: 7 }),
    body("cravingLevel").optional().isInt({ min: 1, max: 10 }),
    body("context").optional().isIn(["work", "family", "environment", "other"]),
    body("note").optional().trim().isLength({ max: 2000 }),
  ],
  validate,
  asyncHandler(createEmotionLog)
);
router.get("/me", verifyToken, requireRole("user"), asyncHandler(myEmotionLogs));
router.get("/streak", verifyToken, requireRole("user"), asyncHandler(myEmotionStreak));

router.get(
  "/:userId/streak",
  verifyToken,
  requireRole("admin"),
  [objectIdParam("userId")],
  validate,
  asyncHandler(userEmotionStreak)
);
router.get(
  "/:userId/logs",
  verifyToken,
  requireRole("admin"),
  [objectIdParam("userId")],
  validate,
  asyncHandler(userEmotionLogs)
);

export default router;
