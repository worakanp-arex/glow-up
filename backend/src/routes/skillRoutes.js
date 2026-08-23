import { Router } from "express";
import { getSkills, createSkill } from "../controllers/skillController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(getSkills));
router.post("/", verifyToken, requireRole("admin"), asyncHandler(createSkill));

export default router;
