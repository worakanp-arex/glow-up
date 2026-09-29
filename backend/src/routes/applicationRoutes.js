import { Router } from "express";
import { body } from "express-validator";
import {
  applyToJob,
  myApplications,
  jobApplicants,
  getApplication,
  updateApplicationStatus,
  cancelApplication,
} from "../controllers/applicationController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { objectIdParam, paginationQuery } from "../middleware/validators.js";
import { uploadApplicationAttachment, verifyUploadedFile } from "../middleware/upload.js";

const router = Router();

router.post(
  "/jobs/:jobId/apply",
  verifyToken,
  requireRole("user"),
  [objectIdParam("jobId")],
  validate,
  uploadApplicationAttachment.array("files"),
  asyncHandler(verifyUploadedFile("applicationAttachment")),
  asyncHandler(applyToJob)
);
router.get("/me", verifyToken, requireRole("user"), [...paginationQuery()], validate, asyncHandler(myApplications));
router.get(
  "/jobs/:jobId/applicants",
  verifyToken,
  requireRole("employer", "admin"),
  [objectIdParam("jobId"), ...paginationQuery()],
  validate,
  asyncHandler(jobApplicants)
);
router.get("/:id", verifyToken, requireRole("employer", "admin"), [objectIdParam("id")], validate, asyncHandler(getApplication));
router.put(
  "/:id/status",
  verifyToken,
  requireRole("employer", "admin"),
  [objectIdParam("id"), body("status").isIn(["pending", "interview", "passed", "rejected", "cancelled"])],
  validate,
  asyncHandler(updateApplicationStatus)
);
router.put(
  "/:id/cancel",
  verifyToken,
  requireRole("user"),
  [objectIdParam("id")],
  validate,
  asyncHandler(cancelApplication)
);

export default router;
