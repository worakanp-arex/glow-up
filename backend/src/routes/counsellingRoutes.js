import { Router } from "express";
import {
  createSession,
  mySessions,
  listQueue,
  mySchedule,
  getSession,
  claimSession,
  addMessage,
  updateSchedule,
  updateStatus,
  getPatientProfile,
} from "../controllers/counsellingController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.post("/", verifyToken, requireRole("user"), asyncHandler(createSession));
router.get("/me", verifyToken, requireRole("user"), asyncHandler(mySessions));

router.get("/schedule/mine", verifyToken, requireRole("counsellor"), asyncHandler(mySchedule));
router.get("/patients/:userId", verifyToken, requireRole("admin", "counsellor"), asyncHandler(getPatientProfile));

router.get("/", verifyToken, requireRole("admin", "counsellor"), asyncHandler(listQueue));
router.get("/:id", verifyToken, asyncHandler(getSession));
router.put("/:id/claim", verifyToken, requireRole("counsellor"), asyncHandler(claimSession));
router.post("/:id/messages", verifyToken, asyncHandler(addMessage));
router.put("/:id/schedule", verifyToken, requireRole("admin", "counsellor"), asyncHandler(updateSchedule));
router.put("/:id/status", verifyToken, requireRole("admin", "counsellor"), asyncHandler(updateStatus));

export default router;
