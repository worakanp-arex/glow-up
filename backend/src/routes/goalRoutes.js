import { Router } from "express";
import { body } from "express-validator";
import { createGoal, myGoals, updateGoal, deleteGoal } from "../controllers/goalController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam } from "../middleware/validators.js";

const router = Router();

const GOAL_BODY = [
  body("title").trim().notEmpty().isLength({ max: 200 }),
  body("description").optional().trim().isLength({ max: 2000 }),
  body("term").isIn(["short", "long"]),
  body("targetDate").optional().isISO8601(),
];
const GOAL_BODY_UPDATE = [
  body("title").optional().trim().notEmpty().isLength({ max: 200 }),
  body("description").optional().trim().isLength({ max: 2000 }),
  body("term").optional().isIn(["short", "long"]),
  body("targetDate").optional().isISO8601(),
  body("progress").optional().isInt({ min: 0, max: 100 }),
  body("status").optional().isIn(["active", "completed", "abandoned"]),
];

router.use(verifyToken, requireRole("user"));

router.get("/me", asyncHandler(myGoals));
router.post("/", GOAL_BODY, validate, asyncHandler(createGoal));
router.put("/:id", [objectIdParam("id"), ...GOAL_BODY_UPDATE], validate, asyncHandler(updateGoal));
router.delete("/:id", [objectIdParam("id")], validate, asyncHandler(deleteGoal));

export default router;
