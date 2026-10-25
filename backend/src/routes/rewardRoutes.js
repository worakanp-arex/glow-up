import { Router } from "express";
import { body } from "express-validator";
import {
  listRewards,
  getReward,
  createReward,
  updateReward,
  deleteReward,
  myRewards,
} from "../controllers/rewardController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam, paginationQuery } from "../middleware/validators.js";

const router = Router();

router.get("/me", verifyToken, requireRole("user"), asyncHandler(myRewards));

router.get("/", verifyToken, [...paginationQuery()], validate, asyncHandler(listRewards));
router.get("/:id", verifyToken, [objectIdParam("id")], validate, asyncHandler(getReward));
const REWARD_BODY = [
  body("description").optional().trim().isLength({ max: 1000 }),
  body("icon").optional().trim().isLength({ max: 50 }),
];
router.post(
  "/",
  verifyToken,
  requireRole("admin"),
  [body("name").trim().notEmpty().isLength({ max: 200 }), body("pointsRequired").isInt({ min: 0, max: 1000000 }), ...REWARD_BODY],
  validate,
  asyncHandler(createReward)
);
router.put(
  "/:id",
  verifyToken,
  requireRole("admin"),
  [
    objectIdParam("id"),
    body("name").optional().trim().notEmpty().isLength({ max: 200 }),
    body("pointsRequired").optional().isInt({ min: 0, max: 1000000 }),
    ...REWARD_BODY,
  ],
  validate,
  asyncHandler(updateReward)
);
router.delete("/:id", verifyToken, requireRole("admin"), [objectIdParam("id")], validate, asyncHandler(deleteReward));

export default router;
