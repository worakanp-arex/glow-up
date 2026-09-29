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
} from "../controllers/activityMissionController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam, paginationQuery } from "../middleware/validators.js";

const router = Router();

router.get("/me/today", verifyToken, requireRole("user"), asyncHandler(myTodayActivities));
router.get("/me/history", verifyToken, requireRole("user"), asyncHandler(myActivityHistory));
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
router.post("/", verifyToken, requireRole("admin", "counsellor"), asyncHandler(createActivityMission));
router.put(
  "/:id",
  verifyToken,
  requireRole("admin", "counsellor"),
  [objectIdParam("id")],
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
