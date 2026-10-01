import { Router } from "express";
import { body } from "express-validator";
import {
  listActivityMissions,
  getActivityMission,
  createActivityMission,
  updateActivityMission,
  deleteActivityMission,
  myTodayActivities,
  logActivity,
  myActivityHistory,
  listPendingActivityApprovals,
  reviewActivityLog,
} from "../controllers/activityMissionController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam, paginationQuery } from "../middleware/validators.js";
import MissionCategory from "../models/MissionCategory.js";
import { ensureDefaultCategories } from "../controllers/missionCategoryController.js";

const router = Router();

async function assertCategoryExists(key) {
  await ensureDefaultCategories();
  const exists = await MissionCategory.exists({ key });
  if (!exists) throw new Error("category must be an existing mission category");
  return true;
}

const CATEGORY_VALIDATOR = body("category").trim().notEmpty().custom(assertCategoryExists);
const CATEGORY_VALIDATOR_OPTIONAL = body("category").optional().trim().notEmpty().custom(assertCategoryExists);

router.get("/me/today", verifyToken, requireRole("user"), asyncHandler(myTodayActivities));
router.get("/me/history", verifyToken, requireRole("user"), asyncHandler(myActivityHistory));
router.get(
  "/logs/pending",
  verifyToken,
  requireRole("admin", "counsellor"),
  asyncHandler(listPendingActivityApprovals)
);
router.put(
  "/logs/:id/review",
  verifyToken,
  requireRole("admin", "counsellor"),
  [objectIdParam("id"), body("approved").isBoolean()],
  validate,
  asyncHandler(reviewActivityLog)
);
router.post(
  "/:id/log",
  verifyToken,
  requireRole("user"),
  [
    objectIdParam("id"),
    body("durationMinutes").optional().isFloat({ min: 0 }),
    body("distanceKm").optional().isFloat({ min: 0 }),
    body("fatigueLevel").optional().isInt({ min: 1, max: 5 }),
    body("enjoymentLevel").optional().isInt({ min: 1, max: 5 }),
    body("note").optional().trim().isLength({ max: 1000 }),
  ],
  validate,
  asyncHandler(logActivity)
);

router.get("/", [...paginationQuery()], validate, asyncHandler(listActivityMissions));
router.get("/:id", [objectIdParam("id")], validate, asyncHandler(getActivityMission));
router.post(
  "/",
  verifyToken,
  requireRole("admin", "counsellor"),
  [CATEGORY_VALIDATOR, body("requiresApproval").optional().isBoolean()],
  validate,
  asyncHandler(createActivityMission)
);
router.put(
  "/:id",
  verifyToken,
  requireRole("admin", "counsellor"),
  [objectIdParam("id"), CATEGORY_VALIDATOR_OPTIONAL, body("requiresApproval").optional().isBoolean()],
  validate,
  asyncHandler(updateActivityMission)
);
router.delete(
  "/:id",
  verifyToken,
  requireRole("admin", "counsellor"),
  [objectIdParam("id")],
  validate,
  asyncHandler(deleteActivityMission)
);

export default router;
