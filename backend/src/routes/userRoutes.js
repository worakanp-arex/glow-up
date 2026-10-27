import { Router } from "express";
import { body, query } from "express-validator";
import {
  updateMe,
  myRecoverySummary,
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
  deleteMyAccount,
  getUser,
} from "../controllers/userController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { changePasswordLimiter } from "../middleware/rateLimiters.js";
import { objectIdParam, paginationQuery, urlBody, newPasswordBody } from "../middleware/validators.js";
import { uploadAvatar, uploadResume, uploadCertificate, verifyUploadedFile } from "../middleware/upload.js";
import { AVATAR_PRESET_KEYS, AVATAR_COLORS, COVER_PRESET_KEYS } from "../constants/profileArt.js";

const router = Router();

const PROFILE_TEXT_FIELD = (name) => body(name).optional().trim().isLength({ max: 200 });

router.get("/me/recovery-summary", verifyToken, requireRole("user"), asyncHandler(myRecoverySummary));
router.put(
  "/me",
  verifyToken,
  [
    PROFILE_TEXT_FIELD("name"),
    PROFILE_TEXT_FIELD("nickname"),
    PROFILE_TEXT_FIELD("province"),
    body("bio").optional().trim().isLength({ max: 1000 }),
    body("familySharing").optional().isObject(),
    body("familySharing.progress").optional().isBoolean({ strict: true }),
    body("familySharing.missions").optional().isBoolean({ strict: true }),
    PROFILE_TEXT_FIELD("phone"),
    body("age").optional().isInt({ min: 0, max: 120 }),
    PROFILE_TEXT_FIELD("gender"),
    body("address").optional().trim().isLength({ max: 500 }),
    PROFILE_TEXT_FIELD("education"),
    PROFILE_TEXT_FIELD("experience"),
    PROFILE_TEXT_FIELD("companyName"),
    PROFILE_TEXT_FIELD("businessType"),
    PROFILE_TEXT_FIELD("taxId"),
    PROFILE_TEXT_FIELD("specialization"),
    PROFILE_TEXT_FIELD("hospital"),
    urlBody("website", { max: 300 }),
    PROFILE_TEXT_FIELD("companySize"),
    body("companyDescription").optional().trim().isLength({ max: 1000 }),
    PROFILE_TEXT_FIELD("contactPosition"),
    PROFILE_TEXT_FIELD("position"),
    PROFILE_TEXT_FIELD("department"),
    PROFILE_TEXT_FIELD("familyName"),
    body("avatarPreset").optional().isIn(AVATAR_PRESET_KEYS),
    body("avatarStyle").optional().isIn(["image", "initial"]),
    body("avatarColor").optional().isIn(AVATAR_COLORS),
    body("coverPreset").optional().isIn(COVER_PRESET_KEYS),
  ],
  validate,
  asyncHandler(updateMe)
);
router.get("/:id/public", verifyToken, [objectIdParam("id")], validate, asyncHandler(getPublicProfile));

router.post(
  "/me/avatar",
  verifyToken,
  uploadAvatar.single("avatar"),
  asyncHandler(verifyUploadedFile("avatar")),
  asyncHandler(uploadMyAvatar)
);
router.post(
  "/me/resume",
  verifyToken,
  requireRole("user"),
  uploadResume.single("resume"),
  asyncHandler(verifyUploadedFile("resume")),
  asyncHandler(uploadMyResume)
);
router.post(
  "/me/certificates",
  verifyToken,
  requireRole("user"),
  uploadCertificate.single("certificate"),
  asyncHandler(verifyUploadedFile("certificate")),
  [body("name").optional().trim().isLength({ max: 200 })],
  validate,
  asyncHandler(addMyCertificate)
);
router.delete(
  "/me/certificates/:id",
  verifyToken,
  requireRole("user"),
  [objectIdParam("id")],
  validate,
  asyncHandler(removeMyCertificate)
);

router.post(
  "/me/rehabilitation",
  verifyToken,
  requireRole("user"),
  [
    body("hospitalName").trim().notEmpty().isLength({ max: 200 }),
    body("startDate").isISO8601(),
    body("endDate").optional().isISO8601(),
    body("status").isIn(["completed", "ongoing"]),
  ],
  validate,
  asyncHandler(addRehabilitationRecord)
);

// "Delete my account" for every role. Wrong passwords are counted like failed password changes.
router.delete(
  "/me",
  verifyToken,
  changePasswordLimiter,
  [
    body("password").optional().isString().isLength({ max: 128 }),
    body("confirmEmail").optional().isString().isLength({ max: 254 }),
  ],
  validate,
  asyncHandler(deleteMyAccount)
);

router.get("/me/skills", verifyToken, requireRole("user"), asyncHandler(listMySkills));
router.post(
  "/me/skills",
  verifyToken,
  requireRole("user"),
  [body("skill").isMongoId(), body("level").optional().isInt({ min: 1, max: 5 })],
  validate,
  asyncHandler(addUserSkill)
);
router.put(
  "/me/skills/:id",
  verifyToken,
  requireRole("user"),
  [objectIdParam("id"), body("level").isInt({ min: 1, max: 5 })],
  validate,
  asyncHandler(updateUserSkill)
);
router.delete(
  "/me/skills/:id",
  verifyToken,
  requireRole("user"),
  [objectIdParam("id")],
  validate,
  asyncHandler(removeUserSkill)
);

router.get(
  "/",
  verifyToken,
  requireRole("admin"),
  [
    query("role").optional().isIn(["user", "family", "employer", "admin", "counsellor"]),
    query("verifiedStatus").optional().isIn(["pending", "verified", "rejected", "suspended"]),
    ...paginationQuery(),
  ],
  validate,
  asyncHandler(listUsers)
);
router.post(
  "/",
  verifyToken,
  requireRole("admin"),
  [
    body("name").trim().notEmpty().isLength({ max: 200 }),
    body("email").isEmail().normalizeEmail(),
    newPasswordBody("password"),
    body("role").isIn(["user", "family", "employer", "admin", "counsellor"]),
    body("phone").optional().trim().isLength({ max: 50 }),
    body("specialization").optional().trim().isLength({ max: 200 }),
    body("hospital").optional().trim().isLength({ max: 200 }),
  ],
  validate,
  asyncHandler(createUserByAdmin)
);
router.get("/:id", verifyToken, requireRole("admin"), [objectIdParam("id")], validate, asyncHandler(getUser));
router.put(
  "/:id/verify",
  verifyToken,
  requireRole("admin"),
  [objectIdParam("id"), body("status").isIn(["verified", "rejected", "suspended"]), body("reason").optional().trim().isLength({ max: 500 })],
  validate,
  asyncHandler(verifyUser)
);
router.put(
  "/:id",
  verifyToken,
  requireRole("admin"),
  [
    objectIdParam("id"),
    body("email").optional().isEmail().normalizeEmail(),
    body("role").optional().isIn(["user", "family", "employer", "admin", "counsellor"]),
  ],
  validate,
  asyncHandler(updateUser)
);
router.delete("/:id", verifyToken, requireRole("admin"), [objectIdParam("id")], validate, asyncHandler(deleteUser));

export default router;
