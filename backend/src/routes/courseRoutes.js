import { Router } from "express";
import {
  listCourses,
  getCourse,
  createCourse,
  myCourses,
  enrollCourse,
  updateProgress,
} from "../controllers/courseController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(listCourses));
router.get("/mine", verifyToken, requireRole("user"), asyncHandler(myCourses));
router.get("/:id", asyncHandler(getCourse));
router.post("/", verifyToken, requireRole("admin"), asyncHandler(createCourse));
router.post("/:id/enroll", verifyToken, requireRole("user"), asyncHandler(enrollCourse));
router.put("/:id/progress", verifyToken, requireRole("user"), asyncHandler(updateProgress));

export default router;
