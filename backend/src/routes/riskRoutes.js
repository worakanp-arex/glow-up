import { Router } from "express";
import { getMyRisk, getAllRiskSummary } from "../controllers/riskController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/me", verifyToken, requireRole("user"), asyncHandler(getMyRisk));
router.get("/all", verifyToken, requireRole("admin"), asyncHandler(getAllRiskSummary));

export default router;
