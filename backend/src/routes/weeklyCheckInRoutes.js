import { Router } from "express";
import {
  submitWeeklyCheckIn,
  myWeeklyCheckIns,
  getWeeklyCheckInsForUser,
} from "../controllers/weeklyCheckInController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.post("/", verifyToken, requireRole("user"), asyncHandler(submitWeeklyCheckIn));
router.get("/me", verifyToken, requireRole("user"), asyncHandler(myWeeklyCheckIns));
router.get("/:userId", verifyToken, requireRole("admin", "counsellor"), asyncHandler(getWeeklyCheckInsForUser));

export default router;
