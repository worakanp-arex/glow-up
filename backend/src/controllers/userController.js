import fs from "fs";
import path from "path";
import User from "../models/User.js";
import RehabilitationRecord from "../models/RehabilitationRecord.js";
import UserSkill from "../models/UserSkill.js";
import { notifyUser } from "../services/notificationService.js";
import { UPLOAD_ROOT, publicUrl } from "../middleware/upload.js";

function removeUploadedFile(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith("/uploads/")) return;
  const filePath = path.join(UPLOAD_ROOT, fileUrl.replace("/uploads/", ""));
  fs.unlink(filePath, () => {});
}

const OWN_PROFILE_FIELDS = [
  "name",
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
  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  });
  res.json(user);
}

export async function getPublicProfile(req, res) {
  const target = await User.findById(req.params.id).select("name role avatarUrl specialization hospital");
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
  const user = await User.findByIdAndUpdate(req.user.id, { avatarUrl: url }, { new: true });
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

// Staff accounts (counsellors, and any other role admin manages directly)
// can't go through the public self-registration/OTP flow, so admin creates
// them here instead.
export async function createUserByAdmin(req, res) {
  const { name, email, password, role, phone, specialization, hospital } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }
  if (!["user", "employer", "admin", "counsellor"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
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
  });

  const obj = user.toObject();
  delete obj.password;
  res.status(201).json(obj);
}

export async function listUsers(req, res) {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.verifiedStatus) filter.verifiedStatus = req.query.verifiedStatus;

  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json(users);
}

export async function verifyUser(req, res) {
  const { status } = req.body;
  if (!["verified", "rejected"].includes(status)) {
    return res.status(400).json({ message: "status must be 'verified' or 'rejected'" });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { verifiedStatus: status },
    { new: true }
  );
  if (!user) {
    return res.status(404).json({ message: "Not found" });
  }

  const message = status === "verified" ? "บัญชีของคุณได้รับการยืนยันแล้ว" : "บัญชีของคุณถูกปฏิเสธการยืนยันตัวตน";
  await notifyUser(user._id, message, "system");

  res.json(user);
}

export async function updateUser(req, res) {
  const updates = pick(req.body, ADMIN_EDITABLE_FIELDS);
  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!user) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(user);
}

export async function deleteUser(req, res) {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "Not found" });
  }
  res.status(204).send();
}
