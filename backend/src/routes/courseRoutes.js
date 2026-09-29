import { Router } from "express";
import { body } from "express-validator";
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
import { validate } from "../middleware/validate.js";
import { objectIdParam, paginationQuery } from "../middleware/validators.js";
import { uploadCertificate, verifyUploadedFile } from "../middleware/upload.js";

const router = Router();

router.get("/", [...paginationQuery()], validate, asyncHandler(listCourses));
router.get("/mine", verifyToken, requireRole("user"), asyncHandler(myCourses));
router.get("/:id", [objectIdParam("id")], validate, asyncHandler(getCourse));
router.post(
  "/",
  verifyToken,
  requireRole("admin", "counsellor"),
  [
    body("title").trim().notEmpty().isLength({ max: 200 }),
    body("description").optional().trim().isLength({ max: 5000 }),
    body("category").optional().trim().isLength({ max: 100 }),
    body("externalUrl").trim().isURL().isLength({ max: 500 }),
    body("tags").optional().isArray({ max: 20 }),
    body("tags.*").optional().isString().trim().isLength({ max: 50 }),
  ],
  validate,
  asyncHandler(createCourse)
);
router.post("/:id/enroll", verifyToken, requireRole("user"), [objectIdParam("id")], validate, asyncHandler(enrollCourse));
router.delete("/:id/enroll", verifyToken, requireRole("user"), [objectIdParam("id")], validate, asyncHandler(unenrollCourse));
router.post(
  "/:id/certificate",
  verifyToken,
  requireRole("user"),
  [objectIdParam("id")],
  validate,
  uploadCertificate.single("certificate"),
  asyncHandler(verifyUploadedFile("certificate")),
  asyncHandler(uploadCourseCertificate)
);

export default router;
