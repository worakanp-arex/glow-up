import { Router } from "express";
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
router.post("/", verifyToken, requireRole("admin"), asyncHandler(createReward));
router.put("/:id", verifyToken, requireRole("admin"), [objectIdParam("id")], validate, asyncHandler(updateReward));
router.delete("/:id", verifyToken, requireRole("admin"), [objectIdParam("id")], validate, asyncHandler(deleteReward));

export default router;
