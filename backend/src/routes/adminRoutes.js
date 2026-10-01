import { Router } from "express";
import { body } from "express-validator";
import { getDashboard, getPointsPerLevel, updatePointsPerLevel } from "../controllers/adminController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/dashboard", verifyToken, requireRole("admin"), asyncHandler(getDashboard));
router.get("/settings/points-per-level", verifyToken, requireRole("admin"), asyncHandler(getPointsPerLevel));
router.put(
  "/settings/points-per-level",
  verifyToken,
  requireRole("admin"),
  [body("pointsPerLevel").isInt({ min: 1 })],
  validate,
  asyncHandler(updatePointsPerLevel)
);

export default router;
