import { Router } from "express";
import { body } from "express-validator";
import { getSkills, createSkill } from "../controllers/skillController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { paginationQuery } from "../middleware/validators.js";

const router = Router();

router.get("/", [...paginationQuery()], validate, asyncHandler(getSkills));
router.post(
  "/",
  verifyToken,
  requireRole("admin"),
  [body("skillName").trim().notEmpty().isLength({ max: 200 }), body("category").optional().trim().isLength({ max: 100 })],
  validate,
  asyncHandler(createSkill)
);

export default router;
