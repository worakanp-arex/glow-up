import { Router } from "express";
import { body, query } from "express-validator";
import {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  uploadCover,
  myCourses,
  enrollCourse,
  unenrollCourse,
  uploadCourseCertificate,
} from "../controllers/courseController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam, paginationQuery, urlBody } from "../middleware/validators.js";
import { uploadCertificate, uploadCourseCover, verifyUploadedFile } from "../middleware/upload.js";

const router = Router();

const COURSE_BODY = [
  body("description").optional().trim().isLength({ max: 5000 }),
  body("category").optional().trim().isLength({ max: 100 }),
  body("tags").optional().isArray({ max: 20 }),
  body("tags.*").optional().isString().trim().isLength({ max: 50 }),
  body("startDate").optional({ values: "falsy" }).isISO8601(),
  body("endDate").optional({ values: "falsy" }).isISO8601(),
  // Built-in images or a previously uploaded cover; never an arbitrary URL.
  body("coverImage").optional({ values: "falsy" }).matches(/^\/(images\/[\w\-/]+\.(png|webp|jpe?g)|uploads\/course-covers\/[\w.-]+)$/),
];

router.get(
  "/",
  [
    query("status").optional().isIn(["active", "upcoming", "expired", "all"]),
    // Search terms must be plain text: ?q[]=a would otherwise reach the regex builder as an array.
    query("q").optional().isString().isLength({ max: 100 }),
    query("category").optional().isString().isLength({ max: 100 }),
    query("tag").optional().isString().isLength({ max: 100 }),
    ...paginationQuery(),
  ],
  validate,
  asyncHandler(listCourses)
);
router.get("/mine", verifyToken, requireRole("user"), asyncHandler(myCourses));
router.post(
  "/cover",
  verifyToken,
  requireRole("admin", "counsellor"),
  uploadCourseCover.single("cover"),
  asyncHandler(verifyUploadedFile("courseCover")),
  asyncHandler(uploadCover)
);
router.get("/:id", [objectIdParam("id")], validate, asyncHandler(getCourse));
router.post(
  "/",
  verifyToken,
  requireRole("admin", "counsellor"),
  [
    body("title").trim().notEmpty().isLength({ max: 200 }),
    urlBody("externalUrl", { required: true }),
    ...COURSE_BODY,
  ],
  validate,
  asyncHandler(createCourse)
);
router.put(
  "/:id",
  verifyToken,
  requireRole("admin", "counsellor"),
  [
    objectIdParam("id"),
    body("title").optional().trim().notEmpty().isLength({ max: 200 }),
    urlBody("externalUrl"),
    ...COURSE_BODY,
  ],
  validate,
  asyncHandler(updateCourse)
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
