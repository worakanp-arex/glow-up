import { Router } from "express";
import { getOverview } from "../controllers/overviewController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", verifyToken, requireRole("admin", "counsellor"), asyncHandler(getOverview));

export default router;
