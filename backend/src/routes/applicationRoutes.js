import { Router } from "express";
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
import { uploadApplicationAttachment } from "../middleware/upload.js";

const router = Router();

router.post(
  "/jobs/:jobId/apply",
  verifyToken,
  requireRole("user"),
  uploadApplicationAttachment.array("files"),
  asyncHandler(applyToJob)
);
router.get("/me", verifyToken, requireRole("user"), asyncHandler(myApplications));
router.get(
  "/jobs/:jobId/applicants",
  verifyToken,
  requireRole("employer", "admin"),
  asyncHandler(jobApplicants)
);
router.get("/:id", verifyToken, requireRole("employer", "admin"), asyncHandler(getApplication));
router.put(
  "/:id/status",
  verifyToken,
  requireRole("employer", "admin"),
  asyncHandler(updateApplicationStatus)
);
router.put("/:id/cancel", verifyToken, requireRole("user"), asyncHandler(cancelApplication));

export default router;
