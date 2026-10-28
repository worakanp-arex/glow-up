import Course from "../models/Course.js";
import UserCourse from "../models/UserCourse.js";
import { createCrudController } from "./crudFactory.js";
import { publicUrl, UPLOAD_ROOT } from "../middleware/upload.js";
import { paginationOptions, escapeRegex } from "../utils/pagination.js";
import { bangkokStartOfDay, bangkokEndOfDay } from "../utils/dateKey.js";
import { sendCourseExpiryReminders } from "../services/courseReminderService.js";
import { recommendCoursesForUser } from "../services/courseRecommendationService.js";
import fs from "fs";
import path from "path";

const { getOne } = createCrudController(Course);
export { getOne as getCourse };

function removeUploadedCover(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith("/uploads/course-covers/")) return;
  fs.unlink(path.join(UPLOAD_ROOT, fileUrl.replace("/uploads/", "")), () => {});
}

// Accepts "YYYY-MM-DD" (or "" / null to clear) and stores the Bangkok day
// boundary so a course ends at the end of its last day, not at midnight.
function parseCourseDate(value, boundary) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const dateKey = String(value).slice(0, 10);
  return boundary === "end" ? bangkokEndOfDay(dateKey) : bangkokStartOfDay(dateKey);
}

// ?status=active|upcoming|expired narrows the list by the course's open/expiry
// dates; anything else (or no value) returns every course.
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
  const query = Course.find(filter).sort({ createdAt: -1 });
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

  const course = await Course.create({
    title,
    description,
    category,
    externalUrl,
    tags: Array.isArray(tags) ? tags : [],
    startDate: parseCourseDate(startDate, "start") || undefined,
    endDate: parseCourseDate(endDate, "end") || undefined,
    coverImage: coverImage || undefined,
    createdBy: req.user.id,
  });
  res.status(201).json(course);
}

// Only whitelisted fields are editable; blank dates / cover clear the value.
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

// Open courses that relate to the jobs the person bookmarked, each with the job
// that prompted it so the page can say why it is suggested.
export async function recommendedCourses(req, res) {
  res.json(await recommendCoursesForUser(req.user.id));
}

export async function myCourses(req, res) {
  // Best-effort nudge for courses that are about to expire; never blocks the list.
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
