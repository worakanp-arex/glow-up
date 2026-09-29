import { Router } from "express";
import { getRecommendedCareers } from "../controllers/careerController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/recommendations", verifyToken, requireRole("user"), asyncHandler(getRecommendedCareers));

export default router;
