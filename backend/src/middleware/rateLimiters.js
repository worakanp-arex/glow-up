import { rateLimit, ipKeyGenerator } from "express-rate-limit";

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

// Family members asking to follow a patient by email: limited per account so the
// endpoint can't be used to probe which addresses belong to patients.
export const familyRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  message: { message: "ส่งคำขอบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});
