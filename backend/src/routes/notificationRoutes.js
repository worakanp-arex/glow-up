import { Router } from "express";
import { myNotifications, markAsRead, markAllAsRead, clearMyNotifications } from "../controllers/notificationController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam, paginationQuery } from "../middleware/validators.js";

const router = Router();

router.get("/me", verifyToken, [...paginationQuery()], validate, asyncHandler(myNotifications));
router.put("/me/read", verifyToken, asyncHandler(markAllAsRead));
router.delete("/me", verifyToken, asyncHandler(clearMyNotifications));
router.put("/:id/read", verifyToken, [objectIdParam("id")], validate, asyncHandler(markAsRead));

export default router;
