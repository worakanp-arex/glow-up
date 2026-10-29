import EmotionLog from "../models/EmotionLog.js";
import User from "../models/User.js";
import { computeStreakStats } from "../services/streakService.js";
import { toBangkokDateKey, shiftDateKey } from "../utils/dateKey.js";
import { checkAndAwardMissions } from "./missionController.js";
import { runRiskAssessment } from "../services/riskAssessmentService.js";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// หน้าเช็คอินให้เลือกย้อนหลัง 7 วัน และอนุญาตเพิ่มอีก 1 วัน
// เผื่อความต่างระหว่างนาฬิกาของผู้ใช้กับเวลาไทยช่วงเที่ยงคืน
const MAX_BACKFILL_DAYS = 7;

export async function createEmotionLog(req, res) {
  const { happinessLevel, cravingLevel, context, note } = req.body;

  if (!Number.isInteger(Number(happinessLevel)) || happinessLevel < 1 || happinessLevel > 7) {
    return res.status(400).json({ message: "กรุณาเลือกระดับความสุข 1-7" });
  }

  const now = new Date();
  const todayKey = toBangkokDateKey(now);

  // `dateKey` (ไม่บังคับ) ให้ผู้ใช้บันทึกย้อนหลังวันที่พลาดไป — ห้ามบันทึกล่วงหน้า
  // ต้องตรวจรูปแบบก่อนเชื่อถือ และย้อนได้ไม่เกินหนึ่งสัปดาห์: สตรีค หมุดหมาย
  // และรางวัลคำนวณจากบันทึกเหล่านี้ การบันทึกย้อนหลังไม่จำกัดจะทำให้ใครก็ปลอมสตรีคยาวๆ ได้
  // (และปิดบังแนวโน้มที่แย่ลงซึ่งการประเมินความเสี่ยงใช้ตรวจจับ)
  let dateKey = todayKey;
  let date = now;
  if (req.body.dateKey !== undefined) {
    if (typeof req.body.dateKey !== "string" || !DATE_KEY_PATTERN.test(req.body.dateKey) || Number.isNaN(Date.parse(req.body.dateKey))) {
      return res.status(400).json({ message: "รูปแบบวันที่ไม่ถูกต้อง" });
    }
    if (req.body.dateKey > todayKey) {
      return res.status(400).json({ message: "ไม่สามารถบันทึกล่วงหน้าในอนาคตได้" });
    }
    if (req.body.dateKey < shiftDateKey(todayKey, -MAX_BACKFILL_DAYS)) {
      return res.status(400).json({ message: `บันทึกย้อนหลังได้ไม่เกิน ${MAX_BACKFILL_DAYS} วัน` });
    }
    dateKey = req.body.dateKey;
    date = new Date(`${dateKey}T12:00:00+07:00`);
  }

  // หนึ่งรายการต่อหนึ่งวัน: การส่งซ้ำในวันเดียวกันจะอัปเดตรายการเดิม
  // แทนการสร้างซ้ำ (ทำให้ปฏิทิน/การวิเคราะห์ไม่กำกวม)
  const log = await EmotionLog.findOneAndUpdate(
    { user: req.user.id, dateKey },
    { happinessLevel, cravingLevel, context, note, date, dateKey },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  await checkAndAwardMissions(req.user.id);
  await runRiskAssessment(req.user.id);

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

// เฉพาะแอดมิน: มุมมองอ่านอย่างเดียวของประวัติเช็คอินของผู้ป่วยรายหนึ่ง เพื่อการทบทวนทางคลินิก
// ไม่เปิดให้ผู้ใช้อื่นเห็นเด็ดขาด
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
