import { Router } from "express";
import { body } from "express-validator";
import {
  listMissions,
  getMission,
  createMission,
  updateMission,
  deleteMission,
  myMissionProgress,
  myPointsSummary,
  approveCustomMission,
} from "../controllers/missionController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam, paginationQuery } from "../middleware/validators.js";

const router = Router();

router.get("/me/summary", verifyToken, requireRole("user"), asyncHandler(myPointsSummary));
router.get("/me", verifyToken, requireRole("user"), asyncHandler(myMissionProgress));

router.get("/", verifyToken, [...paginationQuery()], validate, asyncHandler(listMissions));
router.get("/:id", verifyToken, [objectIdParam("id")], validate, asyncHandler(getMission));
router.post("/", verifyToken, requireRole("admin"), asyncHandler(createMission));
router.put("/:id", verifyToken, requireRole("admin"), [objectIdParam("id")], validate, asyncHandler(updateMission));
router.delete("/:id", verifyToken, requireRole("admin"), [objectIdParam("id")], validate, asyncHandler(deleteMission));
router.post(
  "/:id/approve",
  verifyToken,
  requireRole("admin", "counsellor"),
  [objectIdParam("id"), body("userId").isMongoId()],
  validate,
  asyncHandler(approveCustomMission)
);

export default router;
