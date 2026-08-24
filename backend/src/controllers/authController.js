import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import PendingRegistration from "../models/PendingRegistration.js";
import { publicUrl } from "../middleware/upload.js";
import { sendOtpEmail, sendPasswordResetEmail } from "../services/emailService.js";
import { maybeSendDailyReminder } from "../services/reminderService.js";
import { recordLogin } from "../services/loginEventService.js";

const PUBLIC_REGISTER_FIELDS = [
  "name",
  "email",
  "password",
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

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // matches default JWT_EXPIRES_IN of "7d"
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const PENDING_HARD_TTL_MS = 30 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const IS_DEV = process.env.NODE_ENV !== "production";

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

function signToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function setTokenCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

function sanitize(user) {
  const obj = user.toObject();
  delete obj.password;
  return obj;
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

export async function requestRegistrationOtp(req, res) {
  const { role } = req.body;
  if (!["user", "employer"].includes(role)) {
    return res.status(400).json({ message: "role must be 'user' or 'employer'" });
  }

  const email = req.body.email.toLowerCase();
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const existingPending = await PendingRegistration.findOne({ email });
  if (existingPending && Date.now() - existingPending.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    return res.status(429).json({ message: "กรุณารอสักครู่ก่อนขอรหัส OTP ใหม่อีกครั้ง" });
  }

  const payload = { role };
  for (const field of PUBLIC_REGISTER_FIELDS) {
    if (req.body[field] !== undefined) payload[field] = req.body[field];
  }
  if (req.file) {
    payload.avatarUrl = publicUrl("avatar", req.file.filename);
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const now = Date.now();

  await PendingRegistration.findOneAndUpdate(
    { email },
    {
      email,
      otpHash,
      otpExpiresAt: new Date(now + OTP_TTL_MS),
      lastSentAt: new Date(now),
      attempts: 0,
      payload,
      expiresAt: new Date(now + PENDING_HARD_TTL_MS),
    },
    { upsert: true, new: true }
  );

  const emailResult = await sendOtpEmail(email, otp);

  const response = { message: "ส่งรหัส OTP ไปยังอีเมลแล้ว กรุณาตรวจสอบกล่องข้อความ" };
  if (emailResult.devMode && IS_DEV) {
    response.devOtp = otp;
  }
  res.status(200).json(response);
}

export async function verifyRegistrationOtp(req, res) {
  const email = req.body.email?.toLowerCase();
  const { otp } = req.body;

  const pending = await PendingRegistration.findOne({ email });
  if (!pending) {
    return res.status(400).json({ message: "ไม่พบคำขอสมัครสมาชิกนี้ กรุณาขอรหัส OTP ใหม่" });
  }
  if (pending.otpExpiresAt.getTime() < Date.now()) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    return res.status(400).json({ message: "รหัส OTP หมดอายุ กรุณาขอรหัสใหม่" });
  }
  if (pending.attempts >= OTP_MAX_ATTEMPTS) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    return res.status(400).json({ message: "กรอกรหัสผิดเกินจำนวนที่กำหนด กรุณาขอรหัส OTP ใหม่" });
  }

  const matches = await bcrypt.compare(otp || "", pending.otpHash);
  if (!matches) {
    pending.attempts += 1;
    await pending.save();
    return res.status(400).json({ message: "รหัส OTP ไม่ถูกต้อง" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    return res.status(409).json({ message: "Email already registered" });
  }

  const user = await User.create(pending.payload);
  await PendingRegistration.deleteOne({ _id: pending._id });

  const token = signToken(user);
  setTokenCookie(res, token);
  res.status(201).json({ token, user: sanitize(user) });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  if (!user.password) {
    return res.status(401).json({ message: "บัญชีนี้สมัครผ่าน Google กรุณาเข้าสู่ระบบด้วยปุ่ม Google" });
  }
  if (!(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signToken(user);
  setTokenCookie(res, token);
  maybeSendDailyReminder(user).catch(() => {});
  recordLogin(user).catch(() => {});
  res.json({ token, user: sanitize(user) });
}

export async function googleAuth(req, res) {
  if (!googleClient) {
    return res.status(503).json({ message: "ยังไม่ได้ตั้งค่า Google Sign-In บนเซิร์ฟเวอร์นี้" });
  }
  const { credential, role } = req.body;
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
  const email = payload.email.toLowerCase();

  let user = await User.findOne({ googleId });
  if (!user) {
    user = await User.findOne({ email });
    if (user) {
      user.googleId = googleId;
      if (!user.avatarUrl && payload.picture) user.avatarUrl = payload.picture;
      await user.save();
    } else {
      const chosenRole = ["user", "employer"].includes(role) ? role : "user";
      user = await User.create({
        name: payload.name || email,
        email,
        googleId,
        role: chosenRole,
        avatarUrl: payload.picture,
        verifiedStatus: "pending",
      });
    }
  }

  const token = signToken(user);
  setTokenCookie(res, token);
  maybeSendDailyReminder(user).catch(() => {});
  recordLogin(user).catch(() => {});
  res.json({ token, user: sanitize(user) });
}

export async function forgotPassword(req, res) {
  const email = req.body.email?.toLowerCase();
  const genericResponse = { message: "หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปให้แล้ว" };

  const user = await User.findOne({ email }).select("+password");
  if (!user || !user.password) {
    return res.status(200).json(genericResponse);
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${rawToken}&email=${encodeURIComponent(
    email
  )}`;
  const emailResult = await sendPasswordResetEmail(email, resetUrl);

  const response = { ...genericResponse };
  if (emailResult.devMode && IS_DEV) {
    response.devResetUrl = resetUrl;
  }
  res.status(200).json(response);
}

export async function resetPassword(req, res) {
  const email = req.body.email?.toLowerCase();
  const { token, newPassword } = req.body;
  const tokenHash = crypto.createHash("sha256").update(token || "").digest("hex");

  const user = await User.findOne({
    email,
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  }).select("+resetPasswordTokenHash");

  if (!user) {
    return res.status(400).json({ message: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุ" });
  }

  user.password = newPassword;
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: "ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" });
}

export async function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
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

  user.password = newPassword;
  await user.save();
  res.json({ message: "Password updated" });
}
