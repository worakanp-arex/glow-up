import { Router } from "express";
import { getDashboard } from "../controllers/adminController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/dashboard", verifyToken, requireRole("admin"), asyncHandler(getDashboard));

export default router;
