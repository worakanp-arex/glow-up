import { Router } from "express";
import {
  createEmotionLog,
  myEmotionLogs,
  myEmotionStreak,
  userEmotionLogs,
  userEmotionStreak,
} from "../controllers/emotionController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.post("/", verifyToken, requireRole("user"), asyncHandler(createEmotionLog));
router.get("/me", verifyToken, requireRole("user"), asyncHandler(myEmotionLogs));
router.get("/streak", verifyToken, requireRole("user"), asyncHandler(myEmotionStreak));

router.get("/:userId/streak", verifyToken, requireRole("admin"), asyncHandler(userEmotionStreak));
router.get("/:userId/logs", verifyToken, requireRole("admin"), asyncHandler(userEmotionLogs));

export default router;
