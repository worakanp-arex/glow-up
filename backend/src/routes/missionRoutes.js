import { Router } from "express";
import {
  listMissions,
  getMission,
  createMission,
  updateMission,
  deleteMission,
  myMissionProgress,
} from "../controllers/missionController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/me", verifyToken, requireRole("user"), asyncHandler(myMissionProgress));

router.get("/", verifyToken, asyncHandler(listMissions));
router.get("/:id", verifyToken, asyncHandler(getMission));
router.post("/", verifyToken, requireRole("admin"), asyncHandler(createMission));
router.put("/:id", verifyToken, requireRole("admin"), asyncHandler(updateMission));
router.delete("/:id", verifyToken, requireRole("admin"), asyncHandler(deleteMission));

export default router;
