import Course from "../models/Course.js";
import UserCourse from "../models/UserCourse.js";
import { createCrudController } from "./crudFactory.js";
import { publicUrl } from "../middleware/upload.js";

const { getOne } = createCrudController(Course);
export { getOne as getCourse };

export async function listCourses(req, res) {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.tag) filter.tags = req.query.tag;
  if (req.query.q) {
    const regex = new RegExp(req.query.q.trim(), "i");
    filter.$or = [{ title: regex }, { description: regex }, { tags: regex }];
  }

  const courses = await Course.find(filter).sort({ createdAt: -1 });
  res.json(courses);
}

export async function createCourse(req, res) {
  const { title, description, category, externalUrl, tags } = req.body;
  if (!title || !externalUrl) {
    return res.status(400).json({ message: "กรุณากรอกชื่อคอร์สและลิงก์คอร์สภายนอก" });
  }

  const course = await Course.create({
    title,
    description,
    category,
    externalUrl,
    tags: Array.isArray(tags) ? tags : [],
    createdBy: req.user.id,
  });
  res.status(201).json(course);
}

export async function myCourses(req, res) {
  const enrollments = await UserCourse.find({ user: req.user.id }).populate("course");
  res.json(enrollments);
}

export async function enrollCourse(req, res) {
  const course = await Course.findById(req.params.id);
  if (!course) {
    return res.status(404).json({ message: "Not found" });
  }

  const existing = await UserCourse.findOne({ user: req.user.id, course: course._id });
  if (existing) {
    return res.status(409).json({ message: "Already enrolled" });
  }

  const enrollment = await UserCourse.create({ user: req.user.id, course: course._id });
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
