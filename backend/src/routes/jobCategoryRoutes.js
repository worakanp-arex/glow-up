import { Router } from "express";
import { getJobCategories, createJobCategory } from "../controllers/jobCategoryController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(getJobCategories));
router.post("/", verifyToken, requireRole("admin"), asyncHandler(createJobCategory));

export default router;
