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

const router = Router();

router.get("/me", verifyToken, requireRole("user"), asyncHandler(myRewards));

router.get("/", verifyToken, asyncHandler(listRewards));
router.get("/:id", verifyToken, asyncHandler(getReward));
router.post("/", verifyToken, requireRole("admin"), asyncHandler(createReward));
router.put("/:id", verifyToken, requireRole("admin"), asyncHandler(updateReward));
router.delete("/:id", verifyToken, requireRole("admin"), asyncHandler(deleteReward));

export default router;
