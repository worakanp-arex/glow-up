import { Router } from "express";
import { body } from "express-validator";
import {
  listMissionCategories,
  createMissionCategory,
  updateMissionCategory,
  deleteMissionCategory,
} from "../controllers/missionCategoryController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam } from "../middleware/validators.js";

const router = Router();

router.get("/", verifyToken, asyncHandler(listMissionCategories));
router.post(
  "/",
  verifyToken,
  requireRole("admin"),
  [
    body("key").trim().notEmpty().isLength({ max: 60 }).matches(/^[a-z0-9_]+$/).withMessage("key must be lowercase letters, numbers, underscores"),
    body("label").trim().notEmpty().isLength({ max: 100 }),
    body("icon").optional().trim().isLength({ max: 60 }),
    body("order").optional().isInt(),
  ],
  validate,
  asyncHandler(createMissionCategory)
);
router.put(
  "/:id",
  verifyToken,
  requireRole("admin"),
  [
    objectIdParam("id"),
    body("label").optional().trim().notEmpty().isLength({ max: 100 }),
    body("icon").optional().trim().isLength({ max: 60 }),
    body("order").optional().isInt(),
  ],
  validate,
  asyncHandler(updateMissionCategory)
);
router.delete("/:id", verifyToken, requireRole("admin"), [objectIdParam("id")], validate, asyncHandler(deleteMissionCategory));

export default router;
