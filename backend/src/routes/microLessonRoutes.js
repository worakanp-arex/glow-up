import { Router } from "express";
import {
  listActiveLessons,
  listAllLessons,
  getMicroLesson,
  createMicroLesson,
  updateMicroLesson,
  deleteMicroLesson,
  mySavedLessonIds,
  saveLesson,
  unsaveLesson,
} from "../controllers/microLessonController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam } from "../middleware/validators.js";

const router = Router();
const STAFF_ROLES = ["admin", "counsellor"];

router.get("/", verifyToken, requireRole("user", "family"), asyncHandler(listActiveLessons));
router.get("/saved", verifyToken, requireRole("user", "family"), asyncHandler(mySavedLessonIds));
router.post("/:id/save", verifyToken, requireRole("user", "family"), [objectIdParam("id")], validate, asyncHandler(saveLesson));
router.delete("/:id/save", verifyToken, requireRole("user", "family"), [objectIdParam("id")], validate, asyncHandler(unsaveLesson));
router.get("/all", verifyToken, requireRole(...STAFF_ROLES), asyncHandler(listAllLessons));
router.get("/:id", verifyToken, [objectIdParam("id")], validate, asyncHandler(getMicroLesson));
router.post("/", verifyToken, requireRole(...STAFF_ROLES), asyncHandler(createMicroLesson));
router.put("/:id", verifyToken, requireRole(...STAFF_ROLES), [objectIdParam("id")], validate, asyncHandler(updateMicroLesson));
router.delete("/:id", verifyToken, requireRole(...STAFF_ROLES), [objectIdParam("id")], validate, asyncHandler(deleteMicroLesson));

export default router;
