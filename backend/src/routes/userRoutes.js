import { Router } from "express";
import {
  updateMe,
  getPublicProfile,
  uploadMyAvatar,
  uploadMyResume,
  addMyCertificate,
  removeMyCertificate,
  addRehabilitationRecord,
  addUserSkill,
  listMySkills,
  updateUserSkill,
  removeUserSkill,
  createUserByAdmin,
  listUsers,
  verifyUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { uploadAvatar, uploadResume, uploadCertificate } from "../middleware/upload.js";

const router = Router();

router.put("/me", verifyToken, asyncHandler(updateMe));
router.get("/:id/public", verifyToken, asyncHandler(getPublicProfile));

router.post(
  "/me/avatar",
  verifyToken,
  uploadAvatar.single("avatar"),
  asyncHandler(uploadMyAvatar)
);
router.post(
  "/me/resume",
  verifyToken,
  requireRole("user"),
  uploadResume.single("resume"),
  asyncHandler(uploadMyResume)
);
router.post(
  "/me/certificates",
  verifyToken,
  requireRole("user"),
  uploadCertificate.single("certificate"),
  asyncHandler(addMyCertificate)
);
router.delete("/me/certificates/:id", verifyToken, requireRole("user"), asyncHandler(removeMyCertificate));

router.post("/me/rehabilitation", verifyToken, requireRole("user"), asyncHandler(addRehabilitationRecord));

router.get("/me/skills", verifyToken, requireRole("user"), asyncHandler(listMySkills));
router.post("/me/skills", verifyToken, requireRole("user"), asyncHandler(addUserSkill));
router.put("/me/skills/:id", verifyToken, requireRole("user"), asyncHandler(updateUserSkill));
router.delete("/me/skills/:id", verifyToken, requireRole("user"), asyncHandler(removeUserSkill));

router.get("/", verifyToken, requireRole("admin"), asyncHandler(listUsers));
router.post("/", verifyToken, requireRole("admin"), asyncHandler(createUserByAdmin));
router.put("/:id/verify", verifyToken, requireRole("admin"), asyncHandler(verifyUser));
router.put("/:id", verifyToken, requireRole("admin"), asyncHandler(updateUser));
router.delete("/:id", verifyToken, requireRole("admin"), asyncHandler(deleteUser));

export default router;
