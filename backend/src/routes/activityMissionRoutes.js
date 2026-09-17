import { Router } from "express";
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

const router = Router();

router.get("/me/today", verifyToken, requireRole("user"), asyncHandler(myTodayActivities));
router.get("/me/history", verifyToken, requireRole("user"), asyncHandler(myActivityHistory));
router.post("/:id/log", verifyToken, requireRole("user"), asyncHandler(logActivity));

router.get("/", asyncHandler(listActivityMissions));
router.get("/:id", asyncHandler(getActivityMission));
router.post("/", verifyToken, requireRole("admin", "counsellor"), asyncHandler(createActivityMission));
router.put("/:id", verifyToken, requireRole("admin", "counsellor"), asyncHandler(updateActivityMission));
router.delete("/:id", verifyToken, requireRole("admin", "counsellor"), asyncHandler(deleteActivityMission));

export default router;
