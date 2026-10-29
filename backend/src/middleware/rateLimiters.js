import crypto from "crypto";
import validator from "validator";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";

// ที่เก็บในหน่วยความจำ: เหมาะกับการ deploy แบบโปรเซสเดียวนี้ หากแอปถูกขยาย
// แนวนอนในอนาคต ต้องเปลี่ยนไปใช้ที่เก็บร่วม (เช่น Redis)
//
// ทุก endpoint ที่อ่อนไหวมีตัวจำกัดของตัวเอง (ฟอร์มล็อกอินที่คนใช้มาก
// จึงไม่กินโควตาของการรีเซ็ตรหัสผ่าน) และตัวที่ใช้เดารหัสลับของบัญชีใดบัญชีหนึ่ง
// จำกัดทั้งต่อบัญชีและต่อที่อยู่: บอตเน็ตที่กระจายความพยายามผ่านหลายที่อยู่
// ก็ยังถูกจำกัดที่ตัวบัญชี

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function limiter(options) {
  return rateLimit({ standardHeaders: true, legacyHeaders: false, ...options });
}

// ที่อยู่เดียวกันที่สะกดต่างกันต้องใช้ตัวนับร่วมกัน ไม่เช่นนั้นการเติมจุดหรือ
// "+tag" ในอีเมล Gmail จะให้โควตาใหม่แก่ผู้โจมตี
function emailKey(req, field = "email") {
  const raw = typeof req.body?.[field] === "string" ? req.body[field].slice(0, 254) : "";
  return validator.normalizeEmail(raw) || raw.toLowerCase();
}

const byIp = (req) => ipKeyGenerator(req.ip);
const byUser = (req) => req.user?.id || ipKeyGenerator(req.ip);
// rate limit ทำงานก่อนตรวจ token จึงระบุไคลเอนต์ที่ล็อกอินอยู่ด้วย
// ลายนิ้วมือของข้อมูลยืนยันตัวตนที่ส่งมา ค่าปลอมจะสร้างเพียงถังใช้แล้วทิ้งของตัวเอง
// (และจะถูกปฏิเสธภายหลังอยู่แล้ว)
function byCredential(req) {
  const header = req.headers.authorization;
  const token = (header?.startsWith("Bearer ") ? header.slice(7) : null) || req.cookies?.token;
  return token ? `session:${crypto.createHash("sha256").update(token).digest("hex").slice(0, 32)}` : byIp(req);
}

// ----- ล็อกอิน -----

// นับเฉพาะความพยายามที่ล้มเหลว: โรงพยาบาลหรือโรงเรียนที่อยู่หลังที่อยู่เดียวกัน
// ล็อกอินสำเร็จพร้อมกันได้โดยไม่ล็อกกันเอง
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

// ----- รหัสสมัครสมาชิก -----

export const otpRequestLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 5,
  message: { message: "ขอรหัส OTP บ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

// ป้องกันไม่ให้กล่องจดหมายของคนคนเดียวถูกท่วมด้วยรหัสจากหลายที่อยู่
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

// ----- รีเซ็ตรหัสผ่าน -----

export const forgotPasswordIpLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  message: { message: "ขอรีเซ็ตรหัสผ่านบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

// ตอบเหมือนคำขอที่สำเร็จทุกประการ ดังนั้นการเกินโควตาจึงไม่เปิดเผยอะไร —
// เพียงป้องกันไม่ให้ใครใช้ฟอร์มนี้ส่งอีเมลรีเซ็ตรบกวนที่อยู่ใดที่อยู่หนึ่ง
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

// ----- ครอบครัว -----

// สมาชิกครอบครัวขอติดตามผู้ป่วยด้วยอีเมล: จำกัดต่อบัญชี เพื่อไม่ให้
// endpoint ถูกใช้สอดแนมว่าอีเมลไหนเป็นของผู้ป่วย
export const familyRequestLimiter = limiter({
  windowMs: HOUR,
  limit: 10,
  keyGenerator: byUser,
  message: { message: "ส่งคำขอบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

// คำเชิญส่งอีเมลจากที่อยู่ของแอปนี้ไปหาคนแปลกหน้า จึงจำกัดทั้งต่อสมาชิก
// และต่อผู้รับ เพื่อไม่ให้กลายเป็นช่องทางส่งสแปม
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

// ----- API ทั้งหมด -----

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

// เพดานที่ค่อนข้างหลวมต่อไคลเอนต์ เพื่อลดการสกัดข้อมูลและการถล่มรายการงานสาธารณะ
// การใช้งานปกติไม่มีทางถึง
export const apiLimiter = limiter({
  windowMs: 5 * MINUTE,
  limit: 1500,
  keyGenerator: byCredential,
  skip: (req) => req.path === "/health",
  message: { message: "ส่งคำขอบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

// ทุกการสร้าง/แก้ไข/ลบนับที่นี่ ต่อไคลเอนต์ที่ล็อกอิน: โพสต์ คอมเมนต์
// ข้อความแชท เช็คอิน การแจ้งเตือนที่ถูกกระตุ้น... ล้วนเป็นภาระของฐานข้อมูล
// และการแจ้งเตือนเจ้าหน้าที่ก็กินความสนใจของคนอื่น
export const apiWriteLimiter = limiter({
  windowMs: 5 * MINUTE,
  limit: 240,
  skip: (req) => SAFE_METHODS.includes(req.method),
  keyGenerator: byCredential,
  message: { message: "ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" },
});

// การอัปโหลดแต่ละครั้งอาจมีขนาดหลายเมกะไบต์ ไฟล์อัปโหลดจึงมีโควตาของตัวเองที่เข้มกว่า
export const uploadLimiter = limiter({
  windowMs: HOUR,
  limit: 40,
  skip: (req) => !req.is("multipart/form-data"),
  keyGenerator: byCredential,
  message: { message: "อัปโหลดไฟล์บ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});
