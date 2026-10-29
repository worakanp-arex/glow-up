import Mission from "../models/Mission.js";
import UserMission from "../models/UserMission.js";
import EmotionLog from "../models/EmotionLog.js";
import ScenarioAttempt from "../models/ScenarioAttempt.js";
import { computeStreakStats } from "../services/streakService.js";
import { notifyUser } from "../services/notificationService.js";
import { getTotalPoints, checkAndAwardRewards, notifyLinkedFamily } from "../services/rewardService.js";
import { createCrudController } from "./crudFactory.js";
import { insertOnce } from "../utils/insertOnce.js";
import { computeLevel, getPointsPerLevel, pointsToNextLevel } from "../utils/level.js";
import { counsellorCanAccessPatient } from "../utils/patientAccess.js";
import { bangkokStartOfDay, bangkokEndOfDay, isWithinWindow } from "../utils/dateKey.js";

const { getAll, getOne } = createCrudController(Mission, { hideInactive: true });

const MISSION_FIELDS = ["title", "description", "targetValue", "rewardPoints", "badgeIcon", "active", "order"];

function missionFields(body) {
  const fields = {};
  for (const key of MISSION_FIELDS) if (body[key] !== undefined) fields[key] = body[key];
  if (body.startDate !== undefined) fields.startDate = body.startDate ? bangkokStartOfDay(String(body.startDate).slice(0, 10)) : null;
  if (body.endDate !== undefined) fields.endDate = body.endDate ? bangkokEndOfDay(String(body.endDate).slice(0, 10)) : null;
  return fields;
}

// ตัวชี้วัดที่ภารกิจติดตาม (`type`) ถูกกำหนดตอนสร้างและเปลี่ยนไม่ได้:
// การเปลี่ยนภายหลังจะทำให้ความคืบหน้าเดิมไม่มีความหมาย
export async function createMission(req, res) {
  const mission = await Mission.create({ type: req.body.type, ...missionFields(req.body) });
  res.status(201).json(mission);
}

export async function updateMission(req, res) {
  const mission = await Mission.findByIdAndUpdate(req.params.id, missionFields(req.body), { new: true, runValidators: true });
  if (!mission) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(mission);
}

// การลบภารกิจที่มีคนทำสำเร็จไปแล้วจะทำให้คะแนนที่พวกเขาได้หายไปโดยไม่รู้ตัว
// จึงเก็บเข้าคลัง (ซ่อน, `active: false`) แทน
// ส่วนภารกิจที่ยังไม่มีใครทำสำเร็จจะลบทิ้งเลย
export async function deleteMission(req, res) {
  const mission = await Mission.findById(req.params.id);
  if (!mission) {
    return res.status(404).json({ message: "Not found" });
  }
  const completedBy = await UserMission.countDocuments({ mission: mission._id, completed: true });
  if (completedBy > 0) {
    mission.active = false;
    await mission.save();
    return res.json({ archived: true, completedBy, mission });
  }
  await UserMission.deleteMany({ mission: mission._id });
  await Mission.findByIdAndDelete(mission._id);
  res.status(204).send();
}

// หมุดหมายสตรีคการเลิก (เป็นจำนวนวัน) ที่ได้รับการแจ้งเตือนครอบครัวแบบเฉพาะเจาะจง
// แทนข้อความทั่วไป "มีความคืบหน้าใหม่"
const MILESTONE_STREAK_DAYS = new Set([7, 30, 90, 180, 365]);

export { getAll as listMissions, getOne as getMission };

async function currentValueForMission(userId, mission, streakStats) {
  if (mission.type === "streak") return streakStats.currentStreak;
  if (mission.type === "totalCheckins") return streakStats.totalCheckIns;
  if (mission.type === "scenarioCompleted") {
    // นับเฉพาะสถานการณ์ที่ไม่ซ้ำกัน: การผ่านข้อเดิมซ้ำๆ ต้องไม่นับเพิ่ม
    return (await ScenarioAttempt.distinct("scenario", { user: userId, passed: true })).length;
  }
  // ภารกิจ "custom" ทำเครื่องหมายสำเร็จด้วยมือ (เช่น โดยแอดมิน)
  // ไม่คำนวณใหม่ที่นี่
  return null;
}

// คำนวณความคืบหน้าภารกิจของผู้ใช้ใหม่จากกิจกรรมปัจจุบัน และให้
// ภารกิจ/รางวัลที่เพิ่งถึงเกณฑ์ คะแนนสะสมถูกรวมจากเอกสาร UserMission ที่สำเร็จเสมอ
// ไม่ได้เก็บเป็นตัวนับที่แก้ไขได้ จึงไม่มีทางคลาดเคลื่อน
export async function checkAndAwardMissions(userId) {
  const logs = await EmotionLog.find({ user: userId }).select("date happinessLevel");
  const streakStats = computeStreakStats(logs);

  const missions = (
    await Mission.find({
      active: true,
      type: { $in: ["streak", "totalCheckins", "scenarioCompleted"] },
    })
  ).filter((mission) => isWithinWindow(mission));
  const newlyCompletedMissions = [];

  for (const mission of missions) {
    const currentValue = await currentValueForMission(userId, mission, streakStats);
    if (currentValue === null) continue;

    const progress = Math.min(currentValue, mission.targetValue);
    const justCompleted = currentValue >= mission.targetValue;

    const identity = { user: userId, mission: mission._id };
    await insertOnce(UserMission, identity, { progress: 0, completed: false });

    const changes = { progress };
    if (justCompleted) {
      changes.completed = true;
      changes.completedAt = new Date();
    }

    const userMission = await UserMission.findOneAndUpdate(
      { ...identity, completed: false },
      { $set: changes },
      { new: true }
    );

    if (justCompleted && userMission) {
      newlyCompletedMissions.push({ mission, userMission });
    }
  }

  if (newlyCompletedMissions.length > 0) {
    for (const { mission } of newlyCompletedMissions) {
      await notifyUser(userId, `คุณสำเร็จภารกิจ "${mission.title}" แล้ว!`, "reward", { link: "/streak" });

      const isDayMilestone = mission.type === "streak" && MILESTONE_STREAK_DAYS.has(mission.targetValue);
      await notifyLinkedFamily(
        userId,
        isDayMilestone
          ? `🎉 ผู้ที่คุณติดตามผ่านหมุดหมาย ${mission.targetValue} วันติดต่อกันในเส้นทางฟื้นฟูแล้ว!`
          : undefined
      );
    }
  }

  const newlyEarnedRewards = await checkAndAwardRewards(userId);

  return { newlyCompletedMissions, newlyEarnedRewards };
}

export async function myMissionProgress(req, res) {
  await checkAndAwardMissions(req.user.id);

  const allMissions = await Mission.find({ active: true }).sort({ order: 1, targetValue: 1 });
  const userMissions = await UserMission.find({ user: req.user.id });
  const progressByMission = new Map(userMissions.map((um) => [um.mission.toString(), um]));
  // ภารกิจที่อยู่นอกช่วงเวลาเปิดจะถูกซ่อน เว้นแต่ผู้ใช้ทำสำเร็จไปแล้ว
  const missions = allMissions.filter(
    (mission) => isWithinWindow(mission) || progressByMission.get(mission._id.toString())?.completed
  );

  const result = missions.map((mission) => {
    const um = progressByMission.get(mission._id.toString());
    return {
      mission,
      progress: um?.progress || 0,
      completed: um?.completed || false,
      completedAt: um?.completedAt || null,
    };
  });

  res.json(result);
}

// ผู้ให้คำปรึกษา/แอดมินทำเครื่องหมายภารกิจ "custom" ว่าสำเร็จให้ผู้ใช้เฉพาะราย —
// เป็นภารกิจประเภทเดียวที่ไม่คำนวณอัตโนมัติจากกิจกรรม
// (ดู currentValueForMission ด้านบน) จึงต้องมีขั้นตอนอนุมัติที่ชัดเจน
export async function approveCustomMission(req, res) {
  const mission = await Mission.findOne({ _id: req.params.id, type: "custom", active: true });
  if (!mission) {
    return res.status(404).json({ message: "ไม่พบภารกิจแบบกำหนดเองนี้" });
  }
  const { userId } = req.body;
  if (req.user.role === "counsellor" && !(await counsellorCanAccessPatient(req.user.id, userId))) {
    return res.status(403).json({ message: "คุณไม่ได้รับมอบหมายให้ดูแลผู้ใช้งานนี้" });
  }

  const identity = { user: userId, mission: mission._id };
  await insertOnce(UserMission, identity, { progress: 0, completed: false });
  const userMission = await UserMission.findOneAndUpdate(
    { ...identity, completed: false },
    { $set: { completed: true, completedAt: new Date(), progress: mission.targetValue } },
    { new: true }
  );

  if (userMission) {
    await notifyUser(userId, `คุณสำเร็จภารกิจ "${mission.title}" แล้ว!`, "reward", { link: "/streak" });
    await notifyLinkedFamily(userId);
    await checkAndAwardRewards(userId);
  }

  res.json(userMission || (await UserMission.findOne(identity)));
}

export async function myPointsSummary(req, res) {
  await checkAndAwardMissions(req.user.id);
  const totalPoints = await getTotalPoints(req.user.id);
  const completedMissions = await UserMission.countDocuments({ user: req.user.id, completed: true });
  res.json({
    totalPoints,
    completedMissions,
    level: await computeLevel(totalPoints),
    pointsToNextLevel: await pointsToNextLevel(totalPoints),
    pointsPerLevel: await getPointsPerLevel(),
  });
}
