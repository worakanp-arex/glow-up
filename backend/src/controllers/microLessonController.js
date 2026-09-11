import MicroLesson from "../models/MicroLesson.js";
import { createCrudController } from "./crudFactory.js";

const { getOne } = createCrudController(MicroLesson);
export { getOne as getMicroLesson };

export async function listActiveLessons(req, res) {
  const lessons = await MicroLesson.find({ active: true }).sort({ order: 1, createdAt: -1 });
  res.json(lessons);
}

export async function listAllLessons(req, res) {
  const lessons = await MicroLesson.find().sort({ order: 1, createdAt: -1 });
  res.json(lessons);
}

export async function createMicroLesson(req, res) {
  const { title, body, category, order } = req.body;
  if (!title || !body) {
    return res.status(400).json({ message: "กรุณากรอกชื่อบทเรียนและเนื้อหา" });
  }
  const lesson = await MicroLesson.create({ title, body, category, order, createdBy: req.user.id });
  res.status(201).json(lesson);
}

export async function updateMicroLesson(req, res) {
  const lesson = await MicroLesson.findByIdAndUpdate(req.params.id, req.body, {
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
