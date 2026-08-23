import { Router } from "express";
import { createSession, mySessions } from "../controllers/counsellingController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.post("/", verifyToken, requireRole("user"), asyncHandler(createSession));
router.get("/me", verifyToken, requireRole("user"), asyncHandler(mySessions));

export default router;
