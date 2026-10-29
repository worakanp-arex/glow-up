import Course from "../models/Course.js";
import UserCourse from "../models/UserCourse.js";
import { createCrudController } from "./crudFactory.js";
import { publicUrl, UPLOAD_ROOT } from "../middleware/upload.js";
import { paginationOptions, escapeRegex } from "../utils/pagination.js";
import { bangkokStartOfDay, bangkokEndOfDay } from "../utils/dateKey.js";
import { sendCourseExpiryReminders } from "../services/courseReminderService.js";
import { recommendCoursesForUser, featuredCoursesForUser } from "../services/courseRecommendationService.js";
import fs from "fs";
import path from "path";

const { getOne } = createCrudController(Course);
export { getOne as getCourse };

function removeUploadedCover(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith("/uploads/course-covers/")) return;
  fs.unlink(path.join(UPLOAD_ROOT, fileUrl.replace("/uploads/", "")), () => {});
}

// รับค่า "YYYY-MM-DD" (หรือ "" / null เพื่อล้างค่า) และเก็บเป็นขอบเขตวันตามเวลาไทย
// เพื่อให้คอร์สสิ้นสุดเมื่อจบวันสุดท้าย ไม่ใช่เที่ยงคืน
function parseCourseDate(value, boundary) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const dateKey = String(value).slice(0, 10);
  return boundary === "end" ? bangkokEndOfDay(dateKey) : bangkokStartOfDay(dateKey);
}

// ?status=active|upcoming|expired กรองรายการตามวันเปิด/วันหมดอายุของคอร์ส
// ค่าอื่นหรือไม่ส่งค่า จะคืนทุกคอร์ส
function statusFilter(status, now = new Date()) {
  if (status === "active") {
    return [
      { $or: [{ startDate: null }, { startDate: { $exists: false } }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }] },
    ];
  }
  if (status === "upcoming") return [{ startDate: { $gt: now } }];
  if (status === "expired") return [{ endDate: { $lt: now } }];
  return null;
}

export async function listCourses(req, res) {
  const filter = {};
  const dateFilter = statusFilter(req.query.status);
  if (dateFilter) filter.$and = dateFilter;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.tag) filter.tags = req.query.tag;
  if (req.query.q) {
    const regex = new RegExp(escapeRegex(req.query.q.trim()), "i");
    filter.$or = [{ title: regex }, { description: regex }, { tags: regex }];
  }

  const pagination = paginationOptions(req.query);
  const query = Course.find(filter).sort({ createdAt: -1, _id: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await Course.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  res.json(await query);
}

export async function createCourse(req, res) {
  const { title, description, category, externalUrl, tags, startDate, endDate, coverImage } = req.body;
  if (!title || !externalUrl) {
    return res.status(400).json({ message: "กรุณากรอกชื่อคอร์สและลิงก์คอร์สภายนอก" });
  }
  const start = parseCourseDate(startDate, "start") || undefined;
  const end = parseCourseDate(endDate, "end") || undefined;
  // ตรวจแบบเดียวกับตอนแก้ไข คอร์สที่วันสิ้นสุดอยู่ก่อนวันเริ่มจะไม่มีวันเปิดให้เรียนได้เลย
  if (start && end && end < start) {
    return res.status(400).json({ message: "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น" });
  }

  const course = await Course.create({
    title,
    description,
    category,
    externalUrl,
    tags: Array.isArray(tags) ? tags : [],
    startDate: start,
    endDate: end,
    coverImage: coverImage || undefined,
    createdBy: req.user.id,
  });
  res.status(201).json(course);
}

// แก้ไขได้เฉพาะฟิลด์ที่อยู่ในรายการอนุญาต วันที่/ปกที่ว่างจะล้างค่าเดิม
export async function updateCourse(req, res) {
  const course = await Course.findById(req.params.id);
  if (!course) {
    return res.status(404).json({ message: "Not found" });
  }

  const { title, description, category, externalUrl, tags, startDate, endDate, coverImage } = req.body;
  if (title !== undefined) course.title = title;
  if (description !== undefined) course.description = description;
  if (category !== undefined) course.category = category;
  if (externalUrl !== undefined) course.externalUrl = externalUrl;
  if (tags !== undefined) course.tags = Array.isArray(tags) ? tags : [];
  const start = parseCourseDate(startDate, "start");
  const end = parseCourseDate(endDate, "end");
  if (start !== undefined) course.startDate = start ?? undefined;
  if (end !== undefined) course.endDate = end ?? undefined;
  if (course.startDate && course.endDate && course.endDate < course.startDate) {
    return res.status(400).json({ message: "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น" });
  }
  const previousCover = course.coverImage;
  if (coverImage !== undefined) course.coverImage = coverImage || undefined;
  await course.save();
  if (previousCover && previousCover !== course.coverImage) removeUploadedCover(previousCover);
  res.json(course);
}

export async function uploadCover(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  res.status(201).json({ url: publicUrl("courseCover", req.file.filename) });
}

// คอร์สที่เปิดอยู่และเกี่ยวข้องกับงานที่ผู้ใช้บุ๊กมาร์กไว้ พร้อมระบุงานที่เป็นต้นเหตุ
// เพื่อให้หน้าเว็บบอกเหตุผลที่แนะนำได้
export async function recommendedCourses(req, res) {
  res.json(await recommendCoursesForUser(req.user.id));
}

// คอร์สสำหรับแบนเนอร์เลื่อนวนหน้าคอร์ส เลือกตามทักษะที่ผู้ใช้สนใจ (ดูรายละเอียดที่ featuredCoursesForUser)
export async function featuredCourses(req, res) {
  res.json(await featuredCoursesForUser(req.user.id));
}

export async function myCourses(req, res) {
  // แจ้งเตือนคอร์สที่ใกล้หมดอายุแบบพยายามเต็มที่ (best-effort) และจะไม่ขัดขวางการแสดงรายการ
  await sendCourseExpiryReminders({ userId: req.user.id }).catch(() => {});
  const enrollments = await UserCourse.find({ user: req.user.id }).populate("course");
  res.json(enrollments.filter((enrollment) => enrollment.course));
}

export async function enrollCourse(req, res) {
  const course = await Course.findById(req.params.id);
  if (!course) {
    return res.status(404).json({ message: "Not found" });
  }

  if (course.endDate && course.endDate < new Date()) {
    return res.status(409).json({ message: "คอร์สนี้หมดอายุแล้ว" });
  }

  const existing = await UserCourse.findOne({ user: req.user.id, course: course._id });
  if (existing) {
    return res.status(409).json({ message: "Already enrolled" });
  }

  let enrollment;
  try {
    enrollment = await UserCourse.create({ user: req.user.id, course: course._id });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Already enrolled" });
    }
    throw err;
  }
  await enrollment.populate("course");
  res.status(201).json(enrollment);
}

export async function unenrollCourse(req, res) {
  const deleted = await UserCourse.findOneAndDelete({ course: req.params.id, user: req.user.id });
  if (!deleted) {
    return res.status(404).json({ message: "Not enrolled in this course" });
  }
  res.status(204).send();
}

export async function uploadCourseCertificate(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const certificateUrl = publicUrl("certificate", req.file.filename);
  const enrollment = await UserCourse.findOneAndUpdate(
    { course: req.params.id, user: req.user.id },
    { certificateUrl },
    { new: true }
  ).populate("course");
  if (!enrollment) {
    return res.status(404).json({ message: "กรุณากดใจคอร์สนี้ก่อนอัปโหลดเกียรติบัตร" });
  }
  res.json(enrollment);
}
