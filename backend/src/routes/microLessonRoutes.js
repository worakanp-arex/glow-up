import { Router } from "express";
import {
  listActiveLessons,
  listAllLessons,
  getMicroLesson,
  createMicroLesson,
  updateMicroLesson,
  deleteMicroLesson,
} from "../controllers/microLessonController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
const STAFF_ROLES = ["admin", "counsellor"];

router.get("/", verifyToken, requireRole("user"), asyncHandler(listActiveLessons));
router.get("/all", verifyToken, requireRole(...STAFF_ROLES), asyncHandler(listAllLessons));
router.get("/:id", verifyToken, asyncHandler(getMicroLesson));
router.post("/", verifyToken, requireRole(...STAFF_ROLES), asyncHandler(createMicroLesson));
router.put("/:id", verifyToken, requireRole(...STAFF_ROLES), asyncHandler(updateMicroLesson));
router.delete("/:id", verifyToken, requireRole(...STAFF_ROLES), asyncHandler(deleteMicroLesson));

export default router;
