import { rateLimit } from "express-rate-limit";

// In-memory store: fine for this single-process deployment. If the app is ever
// horizontally scaled, this needs a shared store (e.g. Redis) instead.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

export const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "ขอรหัส OTP บ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});
