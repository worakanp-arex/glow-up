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
import { uploadAvatar, verifyUploadedFile } from "../middleware/upload.js";
import {
  loginIpLimiter,
  loginAccountLimiter,
  googleLimiter,
  otpRequestLimiter,
  otpRequestAccountLimiter,
  otpVerifyIpLimiter,
  otpVerifyAccountLimiter,
  forgotPasswordIpLimiter,
  forgotPasswordAccountLimiter,
  resetPasswordIpLimiter,
  resetPasswordLimiter,
  changePasswordLimiter,
} from "../middleware/rateLimiters.js";
import { emailBody, newPasswordBody, passwordEntryBody, textBody } from "../middleware/validators.js";

const router = Router();

const REGISTRATION_TOKEN = /^[0-9a-f]{64}$/;

router.post(
  "/register/request-otp",
  otpRequestLimiter,
  uploadAvatar.single("avatar"),
  asyncHandler(verifyUploadedFile("avatar")),
  [
    textBody("name", { max: 100, required: true }),
    emailBody(),
    newPasswordBody("password"),
    body("role").isString().bail().isIn(["user", "employer", "family"]).withMessage("role must be 'user', 'employer' or 'family'"),
    body("registrationToken").optional({ values: "falsy" }).isString().bail().matches(REGISTRATION_TOKEN),
    textBody("phone", { max: 30 }),
    textBody("gender", { max: 30 }),
    textBody("address", { max: 300 }),
    textBody("education", { max: 200 }),
    textBody("experience", { max: 500 }),
    textBody("companyName", { max: 200 }),
    textBody("businessType", { max: 100 }),
    textBody("taxId", { max: 30 }),
    body("age").optional({ values: "falsy" }).isInt({ min: 1, max: 120 }).withMessage("age must be between 1 and 120"),
  ],
  validate,
  otpRequestAccountLimiter,
  asyncHandler(requestRegistrationOtp)
);

router.post(
  "/register/verify-otp",
  otpVerifyIpLimiter,
  [
    emailBody(),
    body("otp").isString().bail().trim().matches(/^\d{6}$/).withMessage("otp must be 6 digits"),
    body("registrationToken").isString().bail().matches(REGISTRATION_TOKEN).withMessage("registrationToken is required"),
  ],
  validate,
  otpVerifyAccountLimiter,
  asyncHandler(verifyRegistrationOtp)
);

router.post(
  "/login",
  loginIpLimiter,
  loginAccountLimiter,
  [emailBody(), passwordEntryBody("password")],
  validate,
  asyncHandler(login)
);

router.post(
  "/google",
  googleLimiter,
  [body("credential").isString().bail().isLength({ min: 1, max: 4096 }).withMessage("credential is required")],
  validate,
  asyncHandler(googleAuth)
);

router.post(
  "/forgot-password",
  forgotPasswordIpLimiter,
  [emailBody()],
  validate,
  forgotPasswordAccountLimiter,
  asyncHandler(forgotPassword)
);

router.post(
  "/reset-password",
  resetPasswordIpLimiter,
  resetPasswordLimiter,
  [
    emailBody(),
    body("token").isString().bail().isLength({ min: 1, max: 200 }).withMessage("token is required"),
    newPasswordBody("newPassword"),
  ],
  validate,
  asyncHandler(resetPassword)
);

router.post("/logout", asyncHandler(logout));

router.get("/me", verifyToken, asyncHandler(getMe));

router.put(
  "/change-password",
  verifyToken,
  changePasswordLimiter,
  [passwordEntryBody("currentPassword"), newPasswordBody("newPassword")],
  validate,
  asyncHandler(changePassword)
);

export default router;
