import { Router } from "express";
import { body } from "express-validator";
import {
  requestRegistrationOtp,
  verifyRegistrationOtp,
  login,
  googleAuth,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
  changePassword,
} from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { uploadAvatar } from "../middleware/upload.js";

const router = Router();

router.post(
  "/register/request-otp",
  uploadAvatar.single("avatar"),
  [
    body("name").trim().notEmpty().withMessage("name is required"),
    body("email").isEmail().withMessage("valid email is required").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("password must be at least 6 characters"),
    body("role").isIn(["user", "employer"]).withMessage("role must be 'user' or 'employer'"),
  ],
  validate,
  asyncHandler(requestRegistrationOtp)
);

router.post(
  "/register/verify-otp",
  [
    body("email").isEmail().withMessage("valid email is required").normalizeEmail(),
    body("otp").trim().isLength({ min: 6, max: 6 }).withMessage("otp must be 6 digits"),
  ],
  validate,
  asyncHandler(verifyRegistrationOtp)
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("valid email is required").normalizeEmail(),
    body("password").notEmpty().withMessage("password is required"),
  ],
  validate,
  asyncHandler(login)
);

router.post("/google", [body("credential").notEmpty()], validate, asyncHandler(googleAuth));

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("valid email is required").normalizeEmail()],
  validate,
  asyncHandler(forgotPassword)
);

router.post(
  "/reset-password",
  [
    body("email").isEmail().withMessage("valid email is required").normalizeEmail(),
    body("token").notEmpty().withMessage("token is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("newPassword must be at least 6 characters"),
  ],
  validate,
  asyncHandler(resetPassword)
);

router.post("/logout", asyncHandler(logout));

router.get("/me", verifyToken, asyncHandler(getMe));

router.put(
  "/change-password",
  verifyToken,
  [
    body("currentPassword").notEmpty().withMessage("currentPassword is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("newPassword must be at least 6 characters"),
  ],
  validate,
  asyncHandler(changePassword)
);

export default router;
