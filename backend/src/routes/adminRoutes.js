import { Router } from "express";
import { body, query } from "express-validator";
import { getDashboard, getPointsPerLevel, updatePointsPerLevel } from "../controllers/adminController.js";
import { listDeletedUsers, getDeletedUser, restoreDeletedUser } from "../controllers/deletedUserController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam, paginationQuery } from "../middleware/validators.js";

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

// Accounts that were deleted but are still within their retention period (or have
// since been anonymised). Read-only except for restoring.
router.get(
  "/deleted-users",
  verifyToken,
  requireRole("admin"),
  [
    query("state").optional().isIn(["retained", "anonymized"]),
    query("q").optional().isString().isLength({ max: 100 }),
    ...paginationQuery(),
  ],
  validate,
  asyncHandler(listDeletedUsers)
);
router.get("/deleted-users/:id", verifyToken, requireRole("admin"), [objectIdParam("id")], validate, asyncHandler(getDeletedUser));
router.post("/deleted-users/:id/restore", verifyToken, requireRole("admin"), [objectIdParam("id")], validate, asyncHandler(restoreDeletedUser));

export default router;
