import { Router } from "express";
import { body } from "express-validator";
import {
  listFamilyMissions,
  createFamilyMission,
  updateFamilyMission,
  deleteFamilyMission,
  myTodayFamilyMissions,
  confirmFamilyMission,
} from "../controllers/familyMissionController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam, paginationQuery } from "../middleware/validators.js";

const router = Router();

router.get(
  "/me/today",
  verifyToken,
  requireRole("user", "family"),
  asyncHandler(myTodayFamilyMissions)
);
router.post(
  "/confirm",
  verifyToken,
  requireRole("user", "family"),
  [body("familyMissionId").isMongoId()],
  validate,
  asyncHandler(confirmFamilyMission)
);

router.get("/", verifyToken, requireRole("user", "family", "admin", "counsellor"), [...paginationQuery()], validate, asyncHandler(listFamilyMissions));
router.post(
  "/",
  verifyToken,
  requireRole("admin"),
  [body("title").trim().notEmpty().isLength({ max: 200 }), body("points").optional().isInt({ min: 0 })],
  validate,
  asyncHandler(createFamilyMission)
);
router.put("/:id", verifyToken, requireRole("admin"), [objectIdParam("id")], validate, asyncHandler(updateFamilyMission));
router.delete("/:id", verifyToken, requireRole("admin"), [objectIdParam("id")], validate, asyncHandler(deleteFamilyMission));

export default router;
