import RiskAssessment from "../models/RiskAssessment.js";
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

export async function getAllRiskSummary(req, res) {
  const summary = await RiskAssessment.aggregate([
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$user", latestLevel: { $first: "$level" } } },
    { $group: { _id: "$latestLevel", count: { $sum: 1 } } },
  ]);

  const byLevel = { low: 0, medium: 0, high: 0 };
  for (const item of summary) {
    byLevel[item._id] = item.count;
  }

  res.json({ byLevel });
}
