import crypto from "crypto";
import validator from "validator";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";

// In-memory store: fine for this single-process deployment. If the app is ever
// horizontally scaled, this needs a shared store (e.g. Redis) instead.
//
// Every sensitive endpoint gets its own limiter (so a busy login form can't use
// up the budget of password reset), and the ones that guess a secret for a given
// account are limited per account as well as per address: a botnet spreading
// attempts over many addresses is still capped at the account.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function limiter(options) {
  return rateLimit({ standardHeaders: true, legacyHeaders: false, ...options });
}

// The same address in different spellings must share one counter, or adding a
// dot or "+tag" to a Gmail address would give an attacker a fresh allowance.
function emailKey(req, field = "email") {
  const raw = typeof req.body?.[field] === "string" ? req.body[field].slice(0, 254) : "";
  return validator.normalizeEmail(raw) || raw.toLowerCase();
}

const byIp = (req) => ipKeyGenerator(req.ip);
const byUser = (req) => req.user?.id || ipKeyGenerator(req.ip);
// Rate limiting runs before the token is checked, so identify a signed-in
// client by a fingerprint of the credential it presents. Forged values only
// create their own throw-away bucket (and are refused later anyway).
function byCredential(req) {
  const header = req.headers.authorization;
  const token = (header?.startsWith("Bearer ") ? header.slice(7) : null) || req.cookies?.token;
  return token ? `session:${crypto.createHash("sha256").update(token).digest("hex").slice(0, 32)}` : byIp(req);
}

// ----- sign-in -----

// Only failed attempts count: a hospital or school behind one address can all
// sign in successfully without locking each other out.
export const loginIpLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  skipSuccessfulRequests: true,
  message: { message: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

export const loginAccountLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `login:${emailKey(req)}`,
  message: { message: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง หรือใช้ \"ลืมรหัสผ่าน\"" },
});

export const googleLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 30,
  message: { message: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

// ----- registration codes -----

export const otpRequestLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 5,
  message: { message: "ขอรหัส OTP บ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

// Stops one person's inbox being flooded with codes from many addresses.
export const otpRequestAccountLimiter = limiter({
  windowMs: HOUR,
  limit: 5,
  keyGenerator: (req) => `otp-request:${emailKey(req)}`,
  message: { message: "ขอรหัส OTP สำหรับอีเมลนี้บ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

export const otpVerifyIpLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  message: { message: "ยืนยันรหัส OTP บ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

export const otpVerifyAccountLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  keyGenerator: (req) => `otp-verify:${emailKey(req)}`,
  message: { message: "ยืนยันรหัส OTP บ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

// ----- password reset -----

export const forgotPasswordIpLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  message: { message: "ขอรีเซ็ตรหัสผ่านบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

// Answers exactly like a successful request, so exceeding it reveals nothing —
// it just stops anyone using this form to spam an address with reset emails.
export const forgotPasswordAccountLimiter = limiter({
  windowMs: HOUR,
  limit: 3,
  keyGenerator: (req) => `forgot:${emailKey(req)}`,
  handler: (req, res) => res.status(200).json({ message: "หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปให้แล้ว" }),
});

export const resetPasswordIpLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  message: { message: "พยายามรีเซ็ตรหัสผ่านบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

export const resetPasswordLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  keyGenerator: (req) => `reset:${emailKey(req)}`,
  message: { message: "พยายามรีเซ็ตรหัสผ่านบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

export const changePasswordLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: byUser,
  message: { message: "เปลี่ยนรหัสผ่านผิดพลาดบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

// ----- family -----

// Family members asking to follow a patient by email: limited per account so the
// endpoint can't be used to probe which addresses belong to patients.
export const familyRequestLimiter = limiter({
  windowMs: HOUR,
  limit: 10,
  keyGenerator: byUser,
  message: { message: "ส่งคำขอบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

// An invite sends an email from this app's address to a stranger, so it is
// capped per member and per recipient to keep it from being a spam relay.
export const familyInviteLimiter = limiter({
  windowMs: HOUR,
  limit: 5,
  keyGenerator: byUser,
  message: { message: "ส่งคำเชิญบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

export const familyInviteRecipientLimiter = limiter({
  windowMs: DAY,
  limit: 3,
  keyGenerator: (req) => `invite-to:${emailKey(req)}`,
  message: { message: "อีเมลนี้ได้รับคำเชิญหลายครั้งแล้ว กรุณาลองใหม่ภายหลัง" },
});

// ----- the whole API -----

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

// A generous ceiling per client, mostly to blunt scraping and the public job
// list being hammered; normal use never gets near it.
export const apiLimiter = limiter({
  windowMs: 5 * MINUTE,
  limit: 1500,
  keyGenerator: byCredential,
  skip: (req) => req.path === "/health",
  message: { message: "ส่งคำขอบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

// Every create/update/delete counts here, per signed-in client: posts, comments,
// chat messages, check-ins, notifications triggered... all cost the database
// and, for staff alerts, other people's attention.
export const apiWriteLimiter = limiter({
  windowMs: 5 * MINUTE,
  limit: 240,
  skip: (req) => SAFE_METHODS.includes(req.method),
  keyGenerator: byCredential,
  message: { message: "ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" },
});

// Each upload can be several megabytes, so file uploads get their own, tighter allowance.
export const uploadLimiter = limiter({
  windowMs: HOUR,
  limit: 40,
  skip: (req) => !req.is("multipart/form-data"),
  keyGenerator: byCredential,
  message: { message: "อัปโหลดไฟล์บ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});
