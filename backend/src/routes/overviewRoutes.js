import { Router } from "express";
import { query } from "express-validator";
import { getOverview, getActivityOverview, getAttempts, getOverviewUsers } from "../controllers/overviewController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", verifyToken, requireRole("admin", "counsellor"), asyncHandler(getOverview));
router.get(
  "/activity",
  verifyToken,
  requireRole("admin", "counsellor"),
  [query("days").optional().isInt({ min: 1, max: 90 })],
  validate,
  asyncHandler(getActivityOverview)
);
router.get(
  "/attempts",
  verifyToken,
  requireRole("admin", "counsellor"),
  [query("days").optional().isInt({ min: 1, max: 90 }), query("scenario").optional().isMongoId()],
  validate,
  asyncHandler(getAttempts)
);
router.get(
  "/users",
  verifyToken,
  requireRole("admin", "counsellor"),
  [query("kind").isIn(["active", "risk", "appointments"])],
  validate,
  asyncHandler(getOverviewUsers)
);

export default router;
