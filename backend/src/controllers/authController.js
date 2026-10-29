import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import validator from "validator";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import PendingRegistration from "../models/PendingRegistration.js";
import { isProductionLike } from "../config/env.js";
import { BCRYPT_COST } from "../utils/passwordPolicy.js";
import { publicUrl } from "../middleware/upload.js";
import { sendOtpEmail, sendPasswordResetEmail, sendAccountExistsEmail } from "../services/emailService.js";
import { maybeSendDailyReminder } from "../services/reminderService.js";
import { maybeSendCourseExpiryReminders } from "../services/courseReminderService.js";
import { recordLogin } from "../services/loginEventService.js";
import { disconnectUser } from "../services/socket.js";

const PUBLIC_REGISTER_FIELDS = [
  "name",
  "email",
  "phone",
  "age",
  "gender",
  "address",
  "education",
  "experience",
  "companyName",
  "businessType",
  "taxId",
];

function isTruthyConsent(value) {
  return value === true || value === "true";
}

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const PENDING_HARD_TTL_MS = 30 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
// จะไม่ออกลิงก์รีเซ็ตใหม่ในขณะที่ลิงก์ก่อนหน้ายังใหม่อยู่
// ดังนั้นการกด "ลืมรหัสผ่าน" รัวๆ จะไม่ทำให้ลิงก์ที่เจ้าของถืออยู่ใช้ไม่ได้
const RESET_REISSUE_COOLDOWN_MS = 2 * 60 * 1000;

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

// อายุของ token ล็อกอินคือความยาวของเซสชัน ค่าเริ่มต้นคือหนึ่งวัน
// เพราะแอปเก็บข้อมูลสุขภาพ ตั้ง JWT_EXPIRES_IN (เช่น "12h", "7d") เพื่อเปลี่ยนค่า
function signToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

function cookieOptions() {
  return { httpOnly: true, secure: isProductionLike(), sameSite: "lax" };
}

// cookie เป็นที่เดียวที่เบราว์เซอร์เก็บ token: เป็นแบบ HttpOnly (สคริปต์ในหน้าเว็บ
// อ่านไม่ได้) และหมดอายุพร้อมกับ token ที่อยู่ข้างในพอดี
function setTokenCookie(res, token) {
  const { exp } = jwt.decode(token);
  res.cookie("token", token, { ...cookieOptions(), maxAge: Math.max(exp * 1000 - Date.now(), 0) });
}

function sanitize(user) {
  const obj = user.toObject();
  delete obj.password;
  return obj;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function secretMatches(secret, expectedHash) {
  if (typeof secret !== "string" || !expectedHash) return false;
  const given = Buffer.from(sha256(secret), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// ใช้เทียบเมื่อไม่มีบัญชี (หรือไม่มีรหัสผ่าน) เพื่อให้การล็อกอินด้วย
// อีเมลที่ไม่มีอยู่ใช้เวลาเท่ากับบัญชีจริง
let dummyHash;
function timingDummyHash() {
  dummyHash ??= bcrypt.hash("not-a-real-password", BCRYPT_COST);
  return dummyHash;
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

const OTP_SENT_MESSAGE = "ส่งรหัส OTP ไปยังอีเมลแล้ว กรุณาตรวจสอบกล่องข้อความ";

// ใครก็เริ่มสมัครด้วยอีเมลใดก็ได้ ดังนั้นเบราว์เซอร์ที่เริ่มการสมัคร
// จะได้ `registrationToken` ลับ หากไม่มีความลับนี้จะไม่มีใครแทนที่คำขอที่รออยู่ได้
// (ซึ่งจะเป็นการสลับรหัสผ่านของตนเองเข้ามาภายใต้ OTP ของเจ้าของอีเมลจริง)
// และไม่มีใครสมัครให้เสร็จแทนได้
export async function requestRegistrationOtp(req, res) {
  const { role } = req.body;
  if (!["user", "employer", "family"].includes(role)) {
    return res.status(400).json({ message: "role must be 'user', 'employer' or 'family'" });
  }

  if (!isTruthyConsent(req.body.pdpaConsent)) {
    return res.status(400).json({ message: "กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนสมัครสมาชิก" });
  }

  const email = req.body.email.toLowerCase();
  const otp = generateOtp();
  const registrationToken = crypto.randomBytes(32).toString("hex");

  // ทำงานเท่ากันไม่ว่าอีเมลจะเป็นของใหม่หรือไม่ ดังนั้น response (และเวลาที่ใช้)
  // จะไม่เปิดเผยว่าใครมีบัญชีอยู่แล้ว
  const [otpHash, passwordHash] = await Promise.all([bcrypt.hash(otp, BCRYPT_COST), bcrypt.hash(req.body.password, BCRYPT_COST)]);

  // บัญชีที่ถูกลบยังคงจองอีเมลไว้ (จนกว่าจะถูกทำให้ไม่ระบุตัวตน) จึงนับรวมที่นี่ด้วย
  const existingUser = await User.findOne({ email }).setOptions({ withDeleted: true });
  if (existingUser) {
    await sendAccountExistsEmail(email).catch((err) => console.error("Account-exists email failed:", err.message));
    return res.status(200).json({ message: OTP_SENT_MESSAGE, registrationToken });
  }

  const existingPending = await PendingRegistration.findOne({ email }).select("+registrationTokenHash");
  if (existingPending) {
    const stillOpen = existingPending.otpExpiresAt.getTime() > Date.now();
    const isOwner = secretMatches(req.body.registrationToken, existingPending.registrationTokenHash);
    if (stillOpen && !isOwner) {
      return res.status(429).json({ message: "มีคำขอสมัครด้วยอีเมลนี้อยู่แล้ว กรุณาใช้รหัส OTP ที่ส่งไปทางอีเมล หรือรอสักครู่แล้วลองใหม่" });
    }
    if (isOwner && Date.now() - existingPending.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({ message: "กรุณารอสักครู่ก่อนขอรหัส OTP ใหม่อีกครั้ง" });
    }
  }

  const payload = { role, pdpaConsent: true };
  for (const field of PUBLIC_REGISTER_FIELDS) {
    if (req.body[field] !== undefined) payload[field] = req.body[field];
  }
  if (req.file) {
    payload.avatarUrl = publicUrl("avatar", req.file.filename);
  }

  const now = Date.now();
  await PendingRegistration.findOneAndUpdate(
    { email },
    {
      email,
      otpHash,
      passwordHash,
      registrationTokenHash: sha256(registrationToken),
      otpExpiresAt: new Date(now + OTP_TTL_MS),
      lastSentAt: new Date(now),
      attempts: 0,
      payload,
      expiresAt: new Date(now + PENDING_HARD_TTL_MS),
    },
    { upsert: true, new: true }
  );

  await sendOtpEmail(email, otp);

  res.status(200).json({ message: OTP_SENT_MESSAGE, registrationToken });
}

export async function verifyRegistrationOtp(req, res) {
  const email = req.body.email?.toLowerCase();
  const { otp, registrationToken } = req.body;

  const pending = await PendingRegistration.findOne({ email }).select("+passwordHash +registrationTokenHash");
  // registration token ที่ผิดหรือไม่มี จะดูเหมือน "ไม่มีคำขอนี้" ทุกประการ
  // และไม่ใช้โควตาการลองกรอก OTP ของเจ้าของ
  if (!pending || !secretMatches(registrationToken, pending.registrationTokenHash)) {
    return res.status(400).json({ message: "ไม่พบคำขอสมัครสมาชิกนี้ กรุณาขอรหัส OTP ใหม่" });
  }
  if (pending.otpExpiresAt.getTime() < Date.now()) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    return res.status(400).json({ message: "รหัส OTP หมดอายุ กรุณาขอรหัสใหม่" });
  }
  // นับความพยายามก่อนตรวจรหัส ในขั้นตอน atomic เดียว
  // การเดาพร้อมกันหลายคำขอจึงลอดเกินขีดจำกัดไม่ได้
  const claimed = await PendingRegistration.findOneAndUpdate(
    { _id: pending._id, attempts: { $lt: OTP_MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } }
  );
  if (!claimed) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    return res.status(400).json({ message: "กรอกรหัสผิดเกินจำนวนที่กำหนด กรุณาขอรหัส OTP ใหม่" });
  }

  const matches = await bcrypt.compare(otp || "", pending.otpHash);
  if (!matches) {
    return res.status(400).json({ message: "รหัส OTP ไม่ถูกต้อง" });
  }

  const existingUser = await User.findOne({ email }).setOptions({ withDeleted: true });
  if (existingUser) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    return res.status(409).json({ message: "Email already registered" });
  }

  // คำขอที่รออยู่จากเวอร์ชันเก่าต้องเริ่มใหม่ โดยไม่นำรหัสผ่านแบบข้อความธรรมดากลับมาใช้
  if (!pending.passwordHash) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    return res.status(400).json({ message: "กรุณาขอรหัส OTP ใหม่เพื่อสมัครสมาชิกต่อ" });
  }
  const user = new User({ ...pending.payload, password: pending.passwordHash, pdpaConsentAt: new Date() });
  user.$locals.passwordAlreadyHashed = true;
  await user.save();
  await PendingRegistration.deleteOne({ _id: pending._id });

  setTokenCookie(res, signToken(user));
  res.status(201).json({ user: sanitize(user) });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  // ตอบแบบเดียวสำหรับ "ไม่มีบัญชีนี้" "บัญชีที่ใช้ Google เท่านั้น" และ "รหัสผ่านผิด"
  // หลังจากทำงานเท่ากัน ดังนั้นแบบฟอร์มจะถูกใช้เช็กว่าใครมีบัญชีที่นี่ไม่ได้
  const passwordMatches = await bcrypt.compare(password, user?.password || (await timingDummyHash()));
  if (!user || !user.password || !passwordMatches) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  if (user.verifiedStatus === "suspended") {
    return res.status(403).json({ message: "บัญชีของคุณถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ" });
  }

  setTokenCookie(res, signToken(user));
  maybeSendDailyReminder(user).catch(() => {});
  maybeSendCourseExpiryReminders(user).catch(() => {});
  recordLogin(user).catch(() => {});
  res.json({ user: sanitize(user) });
}

export async function googleAuth(req, res) {
  if (!googleClient) {
    return res.status(503).json({ message: "ยังไม่ได้ตั้งค่า Google Sign-In บนเซิร์ฟเวอร์นี้" });
  }
  const { credential, role, pdpaConsent } = req.body;
  if (!credential) {
    return res.status(400).json({ message: "credential is required" });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(401).json({ message: "Google credential ไม่ถูกต้องหรือหมดอายุ" });
  }

  if (!payload.email_verified) {
    return res.status(401).json({ message: "อีเมล Google นี้ยังไม่ได้ยืนยัน" });
  }

  const googleId = payload.sub;
  // ปรับรูปแบบเหมือนอีเมลที่พิมพ์ในแบบฟอร์มสมัคร ไม่เช่นนั้น
  // คนเดียวจะได้สองบัญชี (john.doe@gmail.com กับ johndoe@gmail.com)
  const email = validator.normalizeEmail(payload.email) || payload.email.toLowerCase();

  // withDeleted: บัญชีที่ถูกลบยังเป็นเจ้าของ Google id และอีเมล จึงต้อง
  // ถูกรู้จักที่นี่ (และปฏิเสธ) แทนที่จะดูเหมือนการสมัครใหม่
  let user = await User.findOne({ googleId }).setOptions({ withDeleted: true });
  if (!user) {
    user = await User.findOne({ email }).setOptions({ withDeleted: true });
    if (user?.deletedAt) {
      // ตรวจก่อนเชื่อมบัญชี: บัญชีที่ถูกลบต้องไม่ถูกแก้ไขจากการล็อกอิน
      return res.status(403).json({ message: "บัญชีนี้ถูกลบแล้ว หากต้องการกู้คืนกรุณาติดต่อผู้ดูแลระบบ" });
    }
    if (user) {
      user.googleId = googleId;
      if (!user.avatarUrl && payload.picture) user.avatarUrl = payload.picture;
      await user.save();
    } else {
      if (!isTruthyConsent(pdpaConsent)) {
        return res.status(400).json({ message: "กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนสมัครสมาชิก" });
      }
      const chosenRole = ["user", "employer", "family"].includes(role) ? role : "user";
      user = await User.create({
        name: payload.name || email,
        email,
        googleId,
        role: chosenRole,
        avatarUrl: payload.picture,
        verifiedStatus: "pending",
        pdpaConsent: true,
        pdpaConsentAt: new Date(),
      });
    }
  }

  if (user.deletedAt) {
    return res.status(403).json({ message: "บัญชีนี้ถูกลบแล้ว หากต้องการกู้คืนกรุณาติดต่อผู้ดูแลระบบ" });
  }
  if (user.verifiedStatus === "suspended") {
    return res.status(403).json({ message: "บัญชีของคุณถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ" });
  }

  setTokenCookie(res, signToken(user));
  maybeSendDailyReminder(user).catch(() => {});
  maybeSendCourseExpiryReminders(user).catch(() => {});
  recordLogin(user).catch(() => {});
  res.json({ user: sanitize(user) });
}

export async function forgotPassword(req, res) {
  const email = req.body.email?.toLowerCase();
  const genericResponse = { message: "หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปให้แล้ว" };

  const user = await User.findOne({ email }).select("+password +resetPasswordExpires");
  if (!user || !user.password) {
    return res.status(200).json(genericResponse);
  }
  // ลิงก์ที่เพิ่งออกเมื่อครู่ยังใช้ได้ ไม่ต้องออกใหม่ทับ
  const lastIssuedAt = user.resetPasswordExpires ? user.resetPasswordExpires.getTime() - RESET_TOKEN_TTL_MS : 0;
  if (Date.now() - lastIssuedAt < RESET_REISSUE_COOLDOWN_MS) {
    return res.status(200).json(genericResponse);
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordTokenHash = sha256(rawToken);
  user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${rawToken}&email=${encodeURIComponent(
    email
  )}`;
  // ไม่รอผล (not awaited): การรอเมลเซิร์ฟเวอร์จะทำให้คำตอบของบัญชีจริง
  // ช้ากว่าบัญชีที่ไม่มีอยู่ ข้อผิดพลาดจะถูกบันทึกให้ผู้ดูแลระบบ
  // และไม่แสดงให้ผู้ใช้เห็น เพื่อไม่ให้ error การส่งเมลเปิดเผยว่าอีเมลไหนสมัครไว้
  sendPasswordResetEmail(email, resetUrl).catch((err) => console.error("Password reset email failed:", err.message));
  res.status(200).json(genericResponse);
}

export async function resetPassword(req, res) {
  const email = req.body.email?.toLowerCase();
  const { token, newPassword } = req.body;
  const tokenHash = sha256(token || "");

  const user = await User.findOne({
    email,
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  }).select("+resetPasswordTokenHash");

  if (!user) {
    return res.status(400).json({ message: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุ" });
  }

  // การบันทึกรหัสผ่านใหม่จะออกจากระบบทุกเซสชันที่เปิดด้วยรหัสเดิมด้วย
  user.password = newPassword;
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  disconnectUser(user._id);

  res.json({ message: "ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" });
}

export function clearSessionCookie(res) {
  res.clearCookie("token", cookieOptions());
}

export async function logout(req, res) {
  clearSessionCookie(res);
  res.json({ message: "Logged out" });
}

export async function getMe(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(sanitize(user));
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select("+password");
  if (!user.password) {
    return res.status(400).json({ message: "บัญชีนี้เข้าสู่ระบบผ่าน Google ไม่มีรหัสผ่านให้เปลี่ยน" });
  }
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  // การบันทึกรหัสผ่านใหม่จะออกจากระบบทุกเซสชันอื่น อุปกรณ์นี้จะได้ token ใหม่
  // เพื่อให้คนที่เพิ่งเปลี่ยนรหัสยังคงล็อกอินอยู่
  user.password = newPassword;
  await user.save();
  disconnectUser(user._id);
  setTokenCookie(res, signToken(user));
  res.json({ message: "Password updated" });
}
