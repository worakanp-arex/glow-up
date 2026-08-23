import { Router } from "express";
import {
  listJobs,
  getJob,
  myJobs,
  listAllJobsForAdmin,
  createJob,
  updateJob,
  deleteJob,
  confirmJob,
} from "../controllers/jobController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(listJobs));
router.get("/mine", verifyToken, requireRole("employer"), asyncHandler(myJobs));
router.get("/admin/all", verifyToken, requireRole("admin"), asyncHandler(listAllJobsForAdmin));
router.get("/:id", asyncHandler(getJob));

router.post("/", verifyToken, requireRole("employer"), asyncHandler(createJob));
router.put("/:id", verifyToken, requireRole("employer", "admin"), asyncHandler(updateJob));
router.delete("/:id", verifyToken, requireRole("employer", "admin"), asyncHandler(deleteJob));
router.put("/:id/confirm", verifyToken, requireRole("admin"), asyncHandler(confirmJob));

export default router;
