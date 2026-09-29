import { Router } from "express";
import { body } from "express-validator";
import {
  submitWeeklyCheckIn,
  myWeeklyCheckIns,
  getWeeklyCheckInsForUser,
} from "../controllers/weeklyCheckInController.js";
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
    body("stressLevel").isInt({ min: 1, max: 5 }),
    body("moodTrend").isIn(["improving", "stable", "worsening"]),
    body("selfHarmRiskFlag").optional().isBoolean(),
    body("notes").optional().trim().isLength({ max: 2000 }),
  ],
  validate,
  asyncHandler(submitWeeklyCheckIn)
);
router.get("/me", verifyToken, requireRole("user"), asyncHandler(myWeeklyCheckIns));
router.get(
  "/:userId",
  verifyToken,
  requireRole("admin", "counsellor"),
  [objectIdParam("userId")],
  validate,
  asyncHandler(getWeeklyCheckInsForUser)
);

export default router;
