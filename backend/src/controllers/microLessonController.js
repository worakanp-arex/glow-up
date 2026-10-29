import MicroLesson from "../models/MicroLesson.js";
import SavedLesson from "../models/SavedLesson.js";
import { notExpiredFilter, parseOptionalEndOfDay } from "../utils/dateKey.js";

const STAFF_ROLES = ["admin", "counsellor"];
const EDITABLE_FIELDS = ["title", "body", "category", "audience", "order", "active"];
const INVALID_EXPIRY = { message: "วันหมดอายุไม่ถูกต้อง" };

// บทเรียนที่สร้างก่อนมีฟิลด์ `audience` ไม่มีค่าตั้งไว้ —
// ให้ถือเป็น "user" เพื่อให้ยังแสดงสำหรับระบบที่ติดตั้งอยู่เดิม
// บทเรียนที่เลยวันหมดอายุจะหลุดจากสิ่งที่สมาชิกเห็น
function readableLessonFilter(role) {
  const readable = role === "family"
    ? { active: true, audience: "family" }
    : { active: true, $or: [{ audience: "user" }, { audience: { $exists: false } }] };
  return { ...readable, $and: [notExpiredFilter()] };
}

export async function listActiveLessons(req, res) {
  const lessons = await MicroLesson.find(readableLessonFilter(req.user.role)).sort({ order: 1, createdAt: -1 });
  res.json(lessons);
}

// เจ้าหน้าที่เปิดบทเรียนใดก็ได้ (รวมฉบับร่าง) คนอื่นเปิดได้เฉพาะบทเรียน
// ที่ใช้งานอยู่และเขียนสำหรับกลุ่มของตน — ฉบับร่างหรือบทเรียนของกลุ่มอื่น
// จะตอบ 404 แทนการยืนยันว่ามีอยู่
export async function getMicroLesson(req, res) {
  const filter = STAFF_ROLES.includes(req.user.role) ? { _id: req.params.id } : { _id: req.params.id, ...readableLessonFilter(req.user.role) };
  const lesson = await MicroLesson.findOne(filter);
  if (!lesson) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(lesson);
}

export async function mySavedLessonIds(req, res) {
  const saved = await SavedLesson.find({ user: req.user.id }).select("lesson");
  res.json(saved.map((item) => item.lesson));
}

export async function saveLesson(req, res) {
  const lesson = await MicroLesson.findOne({ _id: req.params.id, active: true }).select("_id");
  if (!lesson) {
    return res.status(404).json({ message: "ไม่พบบทเรียนนี้" });
  }
  await SavedLesson.updateOne(
    { user: req.user.id, lesson: lesson._id },
    { $setOnInsert: { user: req.user.id, lesson: lesson._id } },
    { upsert: true }
  );
  res.status(201).json({ saved: true });
}

export async function unsaveLesson(req, res) {
  await SavedLesson.deleteOne({ user: req.user.id, lesson: req.params.id });
  res.json({ saved: false });
}

export async function listAllLessons(req, res) {
  const lessons = await MicroLesson.find().sort({ order: 1, createdAt: -1 });
  res.json(lessons);
}

export async function createMicroLesson(req, res) {
  const { title, body, category, order, audience } = req.body;
  if (!title || !body) {
    return res.status(400).json({ message: "กรุณากรอกชื่อบทเรียนและเนื้อหา" });
  }
  const expiresAt = parseOptionalEndOfDay(req.body.expiresAt);
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return res.status(400).json(INVALID_EXPIRY);
  const lesson = await MicroLesson.create({ title, body, category, order, audience, expiresAt: expiresAt || undefined, createdBy: req.user.id });
  res.status(201).json(lesson);
}

export async function updateMicroLesson(req, res) {
  const changes = {};
  for (const field of EDITABLE_FIELDS) if (req.body[field] !== undefined) changes[field] = req.body[field];
  const expiresAt = parseOptionalEndOfDay(req.body.expiresAt);
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return res.status(400).json(INVALID_EXPIRY);
  if (expiresAt !== undefined) changes.expiresAt = expiresAt;
  const lesson = await MicroLesson.findByIdAndUpdate(req.params.id, changes, {
    new: true,
    runValidators: true,
  });
  if (!lesson) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(lesson);
}

export async function deleteMicroLesson(req, res) {
  const lesson = await MicroLesson.findByIdAndDelete(req.params.id);
  if (!lesson) {
    return res.status(404).json({ message: "Not found" });
  }
  res.status(204).send();
}
