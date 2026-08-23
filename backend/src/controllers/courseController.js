import Course from "../models/Course.js";
import UserCourse from "../models/UserCourse.js";
import { createCrudController } from "./crudFactory.js";

const { getAll, getOne, create } = createCrudController(Course);

export { getAll as listCourses, getOne as getCourse, create as createCourse };

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

export async function updateProgress(req, res) {
  const enrollment = await UserCourse.findOneAndUpdate(
    { course: req.params.id, user: req.user.id },
    { progress: req.body.progress },
    { new: true, runValidators: true }
  ).populate("course");
  if (!enrollment) {
    return res.status(404).json({ message: "Not enrolled in this course" });
  }
  res.json(enrollment);
}
