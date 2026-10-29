import fs from "fs";
import path from "path";
import validator from "validator";
import User from "../models/User.js";
import RehabilitationRecord from "../models/RehabilitationRecord.js";
import UserSkill from "../models/UserSkill.js";
import { notifyUser } from "../services/notificationService.js";
import { disconnectUser } from "../services/socket.js";
import { passwordProblem } from "../utils/passwordPolicy.js";
import { softDeleteUser } from "../services/accountLifecycleService.js";
import { clearSessionCookie } from "./authController.js";
import { UPLOAD_ROOT, publicUrl } from "../middleware/upload.js";
import { paginationOptions, escapeRegex } from "../utils/pagination.js";
import { sanitizeText } from "../utils/sanitizeText.js";
import { AVATAR_PRESETS, AVATAR_COLORS, COVER_PRESET_KEYS } from "../constants/profileArt.js";

function removeUploadedFile(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith("/uploads/")) return;
  const filePath = path.join(UPLOAD_ROOT, fileUrl.replace("/uploads/", ""));
  fs.unlink(filePath, () => {});
}

const OWN_PROFILE_FIELDS = [
  "name",
  "nickname",
  "province",
  "bio",
  "phone",
  "age",
  "gender",
  "address",
  "education",
  "experience",
  "companyName",
  "businessType",
  "taxId",
  "specialization",
  "hospital",
  "website",
  "companySize",
  "companyDescription",
  "contactPosition",
  "position",
  "department",
  "familyName",
];

const ADMIN_EDITABLE_FIELDS = [...OWN_PROFILE_FIELDS, "email", "role", "specialization", "hospital"];

function pick(source, fields) {
  const result = {};
  for (const field of fields) {
    if (source[field] !== undefined) result[field] = source[field];
  }
  return result;
}

export async function updateMe(req, res) {
  const updates = pick(req.body, OWN_PROFILE_FIELDS);
  // ภาพโปรไฟล์เลือกจากรายการคีย์ที่กำหนดไว้ เซิร์ฟเวอร์แปลงคีย์เป็น
  // URL จึงไม่มีทางที่ไคลเอนต์จะเก็บที่อยู่รูปภาพอะไรก็ได้
  let replacedAvatarUrl;
  const preset = AVATAR_PRESETS.find((item) => item.key === req.body.avatarPreset);
  if (preset) {
    replacedAvatarUrl = (await User.findById(req.user.id).select("avatarUrl"))?.avatarUrl;
    updates.avatarUrl = preset.url;
    updates.avatarStyle = "image";
  } else if (req.body.avatarStyle === "initial") {
    updates.avatarStyle = "initial";
    if (AVATAR_COLORS.includes(req.body.avatarColor)) updates.avatarColor = req.body.avatarColor;
  } else if (req.body.avatarStyle === "image") {
    updates.avatarStyle = "image";
  }
  if (COVER_PRESET_KEYS.includes(req.body.coverPreset)) updates.coverPreset = req.body.coverPreset;
  // ใช้ dotted path เพื่อให้การสลับตัวเลือกการแชร์ข้อใดข้อหนึ่งไม่รีเซ็ตอีกข้อ
  for (const key of ["progress", "missions"]) {
    if (typeof req.body.familySharing?.[key] === "boolean") {
      updates[`familySharing.${key}`] = req.body.familySharing[key];
    }
  }
  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  });
  if (replacedAvatarUrl && replacedAvatarUrl !== updates.avatarUrl) removeUploadedFile(replacedAvatarUrl);
  res.json(user);
}

export async function getPublicProfile(req, res) {
  const target = await User.findById(req.params.id).select("name role avatarUrl avatarStyle avatarColor specialization hospital");
  if (!target || !["counsellor", "admin"].includes(target.role)) {
    return res.status(404).json({ message: "ไม่พบข้อมูล" });
  }
  res.json(target);
}

export async function uploadMyAvatar(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const url = publicUrl("avatar", req.file.filename);
  const previous = await User.findById(req.user.id);
  const user = await User.findByIdAndUpdate(req.user.id, { avatarUrl: url, avatarStyle: "image" }, { new: true });
  if (previous?.avatarUrl) removeUploadedFile(previous.avatarUrl);

  res.json(user);
}

export async function uploadMyResume(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const url = publicUrl("resume", req.file.filename);
  const previous = await User.findById(req.user.id);
  const user = await User.findByIdAndUpdate(req.user.id, { resumeUrl: url }, { new: true });
  if (previous?.resumeUrl) removeUploadedFile(previous.resumeUrl);

  res.json(user);
}

export async function addMyCertificate(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const url = publicUrl("certificate", req.file.filename);
  const name = req.body.name || req.file.originalname;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $push: { certificates: { name, url } } },
    { new: true }
  );

  res.status(201).json(user);
}

export async function removeMyCertificate(req, res) {
  const user = await User.findById(req.user.id);
  const certificate = user?.certificates.id(req.params.id);
  if (!certificate) {
    return res.status(404).json({ message: "Not found" });
  }

  removeUploadedFile(certificate.url);
  certificate.deleteOne();
  await user.save();

  res.json(user);
}

export async function addRehabilitationRecord(req, res) {
  const { hospitalName, startDate, endDate, status } = req.body;
  const record = await RehabilitationRecord.create({
    user: req.user.id,
    hospitalName,
    startDate,
    endDate,
    status,
  });
  res.status(201).json(record);
}

export async function addUserSkill(req, res) {
  const { skill, level } = req.body;
  const existing = await UserSkill.findOne({ user: req.user.id, skill });
  if (existing) {
    return res.status(409).json({ message: "Skill already added" });
  }

  const userSkill = await UserSkill.create({ user: req.user.id, skill, level });
  await userSkill.populate("skill");
  res.status(201).json(userSkill);
}

export async function listMySkills(req, res) {
  const skills = await UserSkill.find({ user: req.user.id }).populate("skill");
  res.json(skills);
}

export async function updateUserSkill(req, res) {
  const userSkill = await UserSkill.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { level: req.body.level },
    { new: true, runValidators: true }
  ).populate("skill");
  if (!userSkill) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(userSkill);
}

export async function removeUserSkill(req, res) {
  const userSkill = await UserSkill.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!userSkill) {
    return res.status(404).json({ message: "Not found" });
  }
  res.status(204).send();
}

// บัญชีเจ้าหน้าที่ (ผู้ให้คำปรึกษา และบทบาทอื่นที่แอดมินจัดการโดยตรง)
// ผ่านขั้นตอนสมัครสมาชิก/OTP สาธารณะไม่ได้ แอดมินจึงสร้าง
// ที่นี่แทน
export async function createUserByAdmin(req, res) {
  const { name, email, password, role, phone, specialization, hospital } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }
  if (!["user", "family", "employer", "admin", "counsellor"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  const weakness = passwordProblem(password);
  if (weakness) {
    return res.status(400).json({ message: weakness });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role,
    phone,
    specialization,
    hospital,
    verifiedStatus: "verified",
    // บัญชีเจ้าหน้าที่ที่แอดมินสร้างไม่ใช่เหตุการณ์ให้ความยินยอมจากการสมัครเอง —
    // ตรงนี้เพียงทำให้ฟิลด์บังคับของ schema ครบ
    pdpaConsent: true,
    pdpaConsentAt: new Date(),
  });

  const obj = user.toObject();
  delete obj.password;
  res.status(201).json(obj);
}

export async function listUsers(req, res) {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.verifiedStatus) filter.verifiedStatus = req.query.verifiedStatus;
  if (req.query.q) {
    const pattern = new RegExp(escapeRegex(String(req.query.q).trim()), "i");
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const pagination = paginationOptions(req.query);
  const query = User.find(filter).sort({ createdAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await User.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  res.json(await query);
}

const VERIFY_STATUS_MESSAGES = {
  verified: "บัญชีของคุณได้รับการยืนยันแล้ว",
  rejected: "บัญชีของคุณถูกปฏิเสธการยืนยันตัวตน",
  suspended: "บัญชีของคุณถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ",
};

// แอดมินต้องมีบัญชีแอดมินที่ใช้งานได้อย่างน้อยหนึ่งบัญชีเสมอ และไม่มีใคร
// ล็อกตัวเองออกจากระบบจากหน้าจอแอดมินได้
async function isLastActiveAdmin(user) {
  if (user.role !== "admin") return false;
  const others = await User.countDocuments({ role: "admin", _id: { $ne: user._id }, verifiedStatus: { $nin: ["rejected", "suspended"] } });
  return others === 0;
}

export async function getUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(user);
}

export async function verifyUser(req, res) {
  const { status } = req.body;
  if (!["verified", "rejected", "suspended"].includes(status)) {
    return res.status(400).json({ message: "status must be 'verified', 'rejected' or 'suspended'" });
  }

  const reason = typeof req.body.reason === "string" ? sanitizeText(req.body.reason).slice(0, 500) : "";
  if (status !== "verified") {
    const target = await User.findById(req.params.id).select("role");
    if (!target) return res.status(404).json({ message: "Not found" });
    if (String(target._id) === String(req.user.id)) {
      return res.status(400).json({ message: "ไม่สามารถระงับหรือปฏิเสธบัญชีของตัวเองได้" });
    }
    if (await isLastActiveAdmin(target)) {
      return res.status(400).json({ message: "ต้องมีผู้ดูแลระบบที่ใช้งานได้อย่างน้อยหนึ่งคน" });
    }
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { verifiedStatus: status, verificationNote: status === "verified" ? "" : reason },
    { new: true }
  );
  if (!user) {
    return res.status(404).json({ message: "Not found" });
  }

  const message = reason && status !== "verified" ? `${VERIFY_STATUS_MESSAGES[status]} เหตุผล: ${reason}` : VERIFY_STATUS_MESSAGES[status];
  await notifyUser(user._id, message, "system", { link: "/profile" });
  // บัญชีที่ถูกระงับหรือปฏิเสธจะขาดการเชื่อมต่อสดทันที ไม่ต้องรอ token หมดอายุ
  if (status !== "verified") disconnectUser(user._id);

  res.json(user);
}

export async function updateUser(req, res) {
  const updates = pick(req.body, ADMIN_EDITABLE_FIELDS);
  if (updates.role) {
    const target = await User.findById(req.params.id).select("role");
    if (target && target.role === "admin" && updates.role !== "admin") {
      if (String(target._id) === String(req.user.id)) {
        return res.status(400).json({ message: "ไม่สามารถเปลี่ยนบทบาทของตัวเองได้" });
      }
      if (await isLastActiveAdmin(target)) {
        return res.status(400).json({ message: "ต้องมีผู้ดูแลระบบที่ใช้งานได้อย่างน้อยหนึ่งคน" });
      }
    }
  }
  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!user) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(user);
}

// การลบบัญชีจะซ่อนบัญชีและสิ้นสุดเซสชัน คำขอ และการเชื่อมต่อครอบครัว
// แต่เก็บข้อมูลไว้ RETENTION_DAYS วัน (แอดมินตรวจสอบหรือกู้คืนได้จาก
// หน้าบัญชีที่ถูกลบ) ก่อนจะทำให้ไม่ระบุตัวตน
export async function deleteUser(req, res) {
  if (String(req.params.id) === String(req.user.id)) {
    return res.status(400).json({ message: "ไม่สามารถลบบัญชีของตัวเองได้" });
  }
  const target = await User.findById(req.params.id).select("role");
  if (target && await isLastActiveAdmin(target)) {
    return res.status(400).json({ message: "ต้องมีผู้ดูแลระบบที่ใช้งานได้อย่างน้อยหนึ่งคน" });
  }
  const reason = typeof req.body?.reason === "string" ? sanitizeText(req.body.reason).slice(0, 300) : "";
  const user = await softDeleteUser(req.params.id, { actorId: req.user.id, reason: reason || "ลบโดยผู้ดูแลระบบ" });
  if (!user) {
    return res.status(404).json({ message: "Not found" });
  }
  res.status(204).send();
}

// "ลบบัญชีของฉัน" ผู้ใช้ต้องพิสูจน์ว่าเป็นตัวเอง (รหัสผ่าน หรือสำหรับ
// บัญชี Google อย่างเดียวคือพิมพ์อีเมลให้ตรง) เพราะเซสชันที่ถูกขโมย
// อาจลบประวัติการฟื้นฟูของใครสักคนได้ในคลิกเดียว
export async function deleteMyAccount(req, res) {
  const user = await User.findById(req.user.id).select("+password");
  if (!user) {
    return res.status(404).json({ message: "Not found" });
  }
  if (user.password) {
    if (typeof req.body.password !== "string" || !(await user.comparePassword(req.body.password))) {
      return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });
    }
  } else {
    const typed = typeof req.body.confirmEmail === "string" ? req.body.confirmEmail : "";
    const same = (value) => validator.normalizeEmail(value) || String(value).toLowerCase();
    if (!typed || same(typed) !== same(user.email)) {
      return res.status(400).json({ message: "กรุณาพิมพ์อีเมลของบัญชีให้ถูกต้องเพื่อยืนยันการลบ" });
    }
  }
  if (await isLastActiveAdmin(user)) {
    return res.status(400).json({ message: "ต้องมีผู้ดูแลระบบที่ใช้งานได้อย่างน้อยหนึ่งคน" });
  }

  await softDeleteUser(user._id, { actorId: user._id, reason: "ผู้ใช้ลบบัญชีของตัวเอง" });
  clearSessionCookie(res);
  res.status(204).send();
}

export async function myRecoverySummary(req, res) {
  const records = await RehabilitationRecord.find({ user: req.user.id }).select("status startDate endDate");
  const ongoing = records.some(record => record.status === "ongoing");
  const completed = records.filter(record => record.status === "completed" && record.endDate && record.endDate <= new Date())
    .sort((a, b) => b.endDate - a.endDate);
  res.json({ ongoing, endDate: ongoing ? null : completed[0]?.endDate || null });
}
