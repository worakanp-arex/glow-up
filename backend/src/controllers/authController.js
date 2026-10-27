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
// A new reset link is not issued while the previous one is this fresh, so
// hammering "forgot password" can't keep invalidating the link the owner holds.
const RESET_REISSUE_COOLDOWN_MS = 2 * 60 * 1000;

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

// The login token's lifetime is the session length. The default is one day
// because the app holds health data; JWT_EXPIRES_IN (e.g. "12h", "7d") overrides it.
function signToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

function cookieOptions() {
  return { httpOnly: true, secure: isProductionLike(), sameSite: "lax" };
}

// The cookie is the only place the browser keeps the token: it is HttpOnly (page
// scripts can't read it) and expires exactly when the token inside it does.
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

// Compared against when no account (or no password) exists, so a login for an
// unknown email costs the same time as one for a real account.
let dummyHash;
function timingDummyHash() {
  dummyHash ??= bcrypt.hash("not-a-real-password", BCRYPT_COST);
  return dummyHash;
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

const OTP_SENT_MESSAGE = "ส่งรหัส OTP ไปยังอีเมลแล้ว กรุณาตรวจสอบกล่องข้อความ";

// Anyone can start a registration for any email address, so the browser that
// started it gets a secret `registrationToken`. Without that secret nobody can
// replace the pending request (which would swap in their own password under the
// real owner's OTP) or finish it.
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

  // Same work whether or not the address is new, so the response (and how long
  // it takes) doesn't reveal who already has an account.
  const [otpHash, passwordHash] = await Promise.all([bcrypt.hash(otp, BCRYPT_COST), bcrypt.hash(req.body.password, BCRYPT_COST)]);

  // A deleted account keeps its address reserved (until it is anonymised), so it counts here too.
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
  // A wrong or missing registration token looks exactly like "no such request",
  // and doesn't use up the owner's OTP attempts.
  if (!pending || !secretMatches(registrationToken, pending.registrationTokenHash)) {
    return res.status(400).json({ message: "ไม่พบคำขอสมัครสมาชิกนี้ กรุณาขอรหัส OTP ใหม่" });
  }
  if (pending.otpExpiresAt.getTime() < Date.now()) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    return res.status(400).json({ message: "รหัส OTP หมดอายุ กรุณาขอรหัสใหม่" });
  }
  // The attempt is counted before the code is checked, in one atomic step, so
  // parallel guesses can't all slip in under the limit.
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

  // Pending requests from older versions must be restarted without reusing plaintext.
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
  // One answer for "no such account", "Google-only account" and "wrong password",
  // after the same amount of work, so the form can't be used to look up who has
  // an account here.
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
  // Normalised the same way as the email typed into the sign-up form, otherwise
  // one person ends up with two accounts (john.doe@gmail.com and johndoe@gmail.com).
  const email = validator.normalizeEmail(payload.email) || payload.email.toLowerCase();

  // withDeleted: a deleted account still owns its Google id and address, so it must be
  // recognised here (and turned away) rather than looking like a brand-new sign-up.
  let user = await User.findOne({ googleId }).setOptions({ withDeleted: true });
  if (!user) {
    user = await User.findOne({ email }).setOptions({ withDeleted: true });
    if (user?.deletedAt) {
      // Checked before linking: a deleted account must not be modified by signing in.
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
  // A link issued a moment ago is still good; don't replace it.
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
  // Not awaited: waiting for the mail server would make this answer slower for
  // real accounts than for unknown ones. Failures are logged for operators and
  // never shown, so delivery errors don't reveal which emails are registered.
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

  // Saving a new password also signs out every session opened with the old one.
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

  // Saving a new password signs out every other session. This device gets a
  // fresh token so the person who just changed it stays signed in.
  user.password = newPassword;
  await user.save();
  disconnectUser(user._id);
  setTokenCookie(res, signToken(user));
  res.json({ message: "Password updated" });
}
