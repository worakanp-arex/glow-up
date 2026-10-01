import MissionCategory from "../models/MissionCategory.js";
import ActivityMission from "../models/ActivityMission.js";

// The 8 categories this app shipped with, back when they were a hardcoded
// enum (see gameContent.js RECOVERY_DOMAINS). Auto-seeded the first time
// anyone reads the catalog on a database that predates MissionCategory, so
// existing ActivityMission documents referencing these keys keep working.
const DEFAULT_CATEGORIES = [
  { key: "routine", label: "งานบ้าน / กิจวัตร", icon: "Home", order: 1 },
  { key: "physical", label: "ออกกำลังกาย", icon: "Dumbbell", order: 2 },
  { key: "learning", label: "การเรียนรู้", icon: "BookOpen", order: 3 },
  { key: "self_awareness", label: "ตระหนักรู้ตนเอง", icon: "Compass", order: 4 },
  { key: "coping", label: "ทักษะรับมือ", icon: "LifeBuoy", order: 5 },
  { key: "self_monitoring", label: "การติดตามตนเอง", icon: "LineChart", order: 6 },
  { key: "social", label: "สังคม / ความสัมพันธ์", icon: "Users", order: 7 },
  { key: "mindfulness", label: "จิตใจ / สติ", icon: "Brain", order: 8 },
];

export async function ensureDefaultCategories() {
  const count = await MissionCategory.countDocuments();
  if (count === 0) {
    await MissionCategory.insertMany(DEFAULT_CATEGORIES);
  }
}

export async function listMissionCategories(req, res) {
  await ensureDefaultCategories();
  const categories = await MissionCategory.find().sort({ order: 1, createdAt: 1 });
  res.json(categories);
}

export async function createMissionCategory(req, res) {
  const { key, label, icon, order } = req.body;
  const category = await MissionCategory.create({ key, label, icon, order });
  res.status(201).json(category);
}

// `key` is intentionally never editable here — changing it would silently
// orphan every ActivityMission already stored with the old key.
export async function updateMissionCategory(req, res) {
  const { label, icon, order } = req.body;
  const updates = {};
  if (label !== undefined) updates.label = label;
  if (icon !== undefined) updates.icon = icon;
  if (order !== undefined) updates.order = order;

  const category = await MissionCategory.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!category) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(category);
}

export async function deleteMissionCategory(req, res) {
  const category = await MissionCategory.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ message: "Not found" });
  }

  const inUse = await ActivityMission.exists({ category: category.key });
  if (inUse) {
    return res.status(409).json({ message: "ยังมีภารกิจที่ใช้หมวดนี้อยู่ กรุณาย้ายหรือลบภารกิจเหล่านั้นก่อน" });
  }

  await MissionCategory.findByIdAndDelete(req.params.id);
  res.status(204).send();
}
