import { Router } from "express";
import {
  getGameHubStatus,
  spinWheel,
  getMemoryPairs,
  submitMemoryResult,
  getDailyQuiz,
  submitQuiz,
  getMyRadar,
} from "../controllers/gameController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.use(verifyToken, requireRole("user"));

router.get("/me/status", asyncHandler(getGameHubStatus));
router.get("/me/radar", asyncHandler(getMyRadar));
router.post("/wheel/spin", asyncHandler(spinWheel));
router.get("/memory/today", asyncHandler(getMemoryPairs));
router.post("/memory/submit", asyncHandler(submitMemoryResult));
router.get("/quiz/today", asyncHandler(getDailyQuiz));
router.post("/quiz/submit", asyncHandler(submitQuiz));

export default router;
