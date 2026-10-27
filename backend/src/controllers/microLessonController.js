import MicroLesson from "../models/MicroLesson.js";
import SavedLesson from "../models/SavedLesson.js";

const STAFF_ROLES = ["admin", "counsellor"];
const EDITABLE_FIELDS = ["title", "body", "category", "audience", "order", "active"];

// Lessons created before the `audience` field existed have no value set —
// treat those as "user" so they keep showing up for existing installs.
function readableLessonFilter(role) {
  return role === "family"
    ? { active: true, audience: "family" }
    : { active: true, $or: [{ audience: "user" }, { audience: { $exists: false } }] };
}

export async function listActiveLessons(req, res) {
  const lessons = await MicroLesson.find(readableLessonFilter(req.user.role)).sort({ order: 1, createdAt: -1 });
  res.json(lessons);
}

// Staff may open any lesson (drafts included); everyone else only the active
// lessons written for their audience — a draft or the other audience's lesson
// answers 404 rather than confirming it exists.
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
  const { title, body, category, order } = req.body;
  if (!title || !body) {
    return res.status(400).json({ message: "กรุณากรอกชื่อบทเรียนและเนื้อหา" });
  }
  const lesson = await MicroLesson.create({ title, body, category, order, createdBy: req.user.id });
  res.status(201).json(lesson);
}

export async function updateMicroLesson(req, res) {
  const changes = {};
  for (const field of EDITABLE_FIELDS) if (req.body[field] !== undefined) changes[field] = req.body[field];
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
