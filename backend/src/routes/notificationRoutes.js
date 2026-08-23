import { Router } from "express";
import { myNotifications, markAsRead } from "../controllers/notificationController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/me", verifyToken, asyncHandler(myNotifications));
router.put("/:id/read", verifyToken, asyncHandler(markAsRead));

export default router;
