import { Router } from "express";
import {
  listCourses,
  getCourse,
  createCourse,
  myCourses,
  enrollCourse,
  unenrollCourse,
  uploadCourseCertificate,
} from "../controllers/courseController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { uploadCertificate } from "../middleware/upload.js";

const router = Router();

router.get("/", asyncHandler(listCourses));
router.get("/mine", verifyToken, requireRole("user"), asyncHandler(myCourses));
router.get("/:id", asyncHandler(getCourse));
router.post("/", verifyToken, requireRole("admin", "counsellor"), asyncHandler(createCourse));
router.post("/:id/enroll", verifyToken, requireRole("user"), asyncHandler(enrollCourse));
router.delete("/:id/enroll", verifyToken, requireRole("user"), asyncHandler(unenrollCourse));
router.post(
  "/:id/certificate",
  verifyToken,
  requireRole("user"),
  uploadCertificate.single("certificate"),
  asyncHandler(uploadCourseCertificate)
);

export default router;
