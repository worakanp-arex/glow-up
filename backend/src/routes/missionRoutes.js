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
const MISSION_BODY = [
  body("description").optional().trim().isLength({ max: 1000 }),
  body("badgeIcon").optional().trim().isLength({ max: 50 }),
  body("active").optional().isBoolean(),
  body("order").optional().isInt({ min: 0, max: 10000 }),
  body("startDate").optional({ values: "falsy" }).isISO8601(),
  body("endDate").optional({ values: "falsy" }).isISO8601(),
];
router.post(
  "/",
  verifyToken,
  requireRole("admin"),
  [
    body("title").trim().notEmpty().isLength({ max: 200 }),
    body("type").isIn(["streak", "totalCheckins", "scenarioCompleted", "custom"]),
    body("targetValue").isInt({ min: 1, max: 100000 }),
    body("rewardPoints").optional().isInt({ min: 0, max: 100000 }),
    ...MISSION_BODY,
  ],
  validate,
  asyncHandler(createMission)
);
router.put(
  "/:id",
  verifyToken,
  requireRole("admin"),
  [
    objectIdParam("id"),
    body("title").optional().trim().notEmpty().isLength({ max: 200 }),
    body("targetValue").optional().isInt({ min: 1, max: 100000 }),
    body("rewardPoints").optional().isInt({ min: 0, max: 100000 }),
    ...MISSION_BODY,
  ],
  validate,
  asyncHandler(updateMission)
);
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
