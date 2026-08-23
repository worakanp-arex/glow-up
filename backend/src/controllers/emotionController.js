import EmotionLog from "../models/EmotionLog.js";
import User from "../models/User.js";
import { computeStreakStats } from "../services/streakService.js";
import { toBangkokDateKey } from "../utils/dateKey.js";

export async function createEmotionLog(req, res) {
  const { happinessLevel, cravingLevel, context, note } = req.body;

  if (!Number.isInteger(Number(happinessLevel)) || happinessLevel < 1 || happinessLevel > 7) {
    return res.status(400).json({ message: "กรุณาเลือกระดับความสุข 1-7" });
  }

  const now = new Date();
  const dateKey = toBangkokDateKey(now);

  // One entry per calendar day: re-submitting today updates today's entry
  // instead of creating a duplicate (keeps the calendar/analysis unambiguous).
  const log = await EmotionLog.findOneAndUpdate(
    { user: req.user.id, dateKey },
    { happinessLevel, cravingLevel, context, note, date: now, dateKey },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

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
