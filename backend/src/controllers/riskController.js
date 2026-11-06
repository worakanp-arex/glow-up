import RiskAssessment from "../models/RiskAssessment.js";
import EmotionLog from "../models/EmotionLog.js";
import { toBangkokDateKey, shiftDateKey } from "../utils/dateKey.js";
import { runRiskAssessment } from "../services/riskAssessmentService.js";

// การคำนวณผลประเมินจะบันทึกข้อมูลและอาจแจ้งทีมดูแล จึงเป็น POST
// GET ต้องไม่เปลี่ยนแปลงอะไรเด็ดขาด: ลิงก์หรือรูปภาพบนเว็บอื่นสามารถ
// ทำให้เบราว์เซอร์ที่ล็อกอินอยู่ส่งคำขอได้
export async function assessMyRisk(req, res) {
  const assessment = await runRiskAssessment(req.user.id);
  res.status(201).json(assessment);
}

export async function getMyRisk(req, res) {
  const assessment = await RiskAssessment.findOne({ user: req.user.id }).sort({ createdAt: -1 });
  if (!assessment) {
    return res.status(404).json({ message: "ยังไม่มีผลการประเมิน" });
  }
  res.json(assessment);
}

const MOOD_TREND_DAYS = 30;
// วันที่มีคนบันทึกน้อยกว่านี้จะไม่แสดง ไม่ให้ค่าเฉลี่ยของคนไม่กี่คนเผยอารมณ์รายบุคคล
const MOOD_MIN_ENTRIES = 3;

export async function getAllRiskSummary(req, res) {
  const sinceKey = shiftDateKey(toBangkokDateKey(new Date()), -(MOOD_TREND_DAYS - 1));
  const [summary, moodRaw] = await Promise.all([
    RiskAssessment.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$user", latestLevel: { $first: "$level" } } },
      { $group: { _id: "$latestLevel", count: { $sum: 1 } } },
    ]),
    // ค่าเฉลี่ยความสุขรายวันของผู้ใช้ทุกคนรวมกัน ไม่คืนข้อมูลรายบุคคล
    EmotionLog.aggregate([
      { $match: { dateKey: { $gte: sinceKey } } },
      { $lookup: { from: "users", localField: "user", foreignField: "_id", pipeline: [{ $match: { deletedAt: null } }, { $project: { _id: 1 } }], as: "owner" } },
      { $match: { "owner.0": { $exists: true } } },
      { $group: { _id: "$dateKey", average: { $avg: "$happinessLevel" }, count: { $sum: 1 } } },
      { $match: { count: { $gte: MOOD_MIN_ENTRIES } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const byLevel = { low: 0, medium: 0, high: 0 };
  for (const item of summary) {
    byLevel[item._id] = item.count;
  }

  const moodTrend = moodRaw.map((item) => ({ dateKey: item._id, average: Math.round(item.average * 10) / 10, count: item.count }));
  res.json({ byLevel, moodTrend, moodTrendDays: MOOD_TREND_DAYS });
}
