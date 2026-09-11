import EmotionLog from "../models/EmotionLog.js";
import User from "../models/User.js";
import { computeStreakStats } from "../services/streakService.js";
import { toBangkokDateKey } from "../utils/dateKey.js";
import { checkAndAwardMissions } from "./missionController.js";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function createEmotionLog(req, res) {
  const { happinessLevel, cravingLevel, context, note } = req.body;

  if (!Number.isInteger(Number(happinessLevel)) || happinessLevel < 1 || happinessLevel > 7) {
    return res.status(400).json({ message: "กรุณาเลือกระดับความสุข 1-7" });
  }

  const now = new Date();
  const todayKey = toBangkokDateKey(now);

  // Optional `dateKey` lets a user backfill a past day they missed — never
  // allow logging into the future, and validate the format before trusting it.
  let dateKey = todayKey;
  let date = now;
  if (req.body.dateKey !== undefined) {
    if (!DATE_KEY_PATTERN.test(req.body.dateKey)) {
      return res.status(400).json({ message: "รูปแบบวันที่ไม่ถูกต้อง" });
    }
    if (req.body.dateKey > todayKey) {
      return res.status(400).json({ message: "ไม่สามารถบันทึกล่วงหน้าในอนาคตได้" });
    }
    dateKey = req.body.dateKey;
    date = new Date(`${dateKey}T12:00:00+07:00`);
  }

  // One entry per calendar day: re-submitting the same day updates that
  // entry instead of creating a duplicate (keeps the calendar/analysis unambiguous).
  const log = await EmotionLog.findOneAndUpdate(
    { user: req.user.id, dateKey },
    { happinessLevel, cravingLevel, context, note, date, dateKey },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  await checkAndAwardMissions(req.user.id);

  res.status(201).json(log);
}

export async function myEmotionLogs(req, res) {
  const logs = await EmotionLog.find({ user: req.user.id }).sort({ date: -1 });
  res.json(logs);
}

export async function myEmotionStreak(req, res) {
  const logs = await EmotionLog.find({ user: req.user.id }).select("date happinessLevel");
  const stats = computeStreakStats(logs);
  res.json(stats);
}

// Admin-only: read-only view of a specific patient's check-in history, for
// clinical review. Never exposes this to other users.
export async function userEmotionStreak(req, res) {
  const targetUser = await User.findById(req.params.userId).select("name email role");
  if (!targetUser || targetUser.role !== "user") {
    return res.status(404).json({ message: "ไม่พบผู้ใช้งานนี้" });
  }

  const logs = await EmotionLog.find({ user: targetUser._id }).select("date happinessLevel");
  const stats = computeStreakStats(logs);
  res.json({ user: { name: targetUser.name, email: targetUser.email }, ...stats });
}

export async function userEmotionLogs(req, res) {
  const targetUser = await User.findById(req.params.userId).select("role");
  if (!targetUser || targetUser.role !== "user") {
    return res.status(404).json({ message: "ไม่พบผู้ใช้งานนี้" });
  }

  const logs = await EmotionLog.find({ user: targetUser._id }).sort({ date: -1 });
  res.json(logs);
}
