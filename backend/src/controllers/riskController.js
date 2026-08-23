import EmotionLog from "../models/EmotionLog.js";
import RiskAssessment from "../models/RiskAssessment.js";
import { assessRisk } from "../services/riskPredictionService.js";

export async function getMyRisk(req, res) {
  const emotionLogs = await EmotionLog.find({ user: req.user.id }).sort({ date: -1 }).limit(30);
  const result = await assessRisk(req.user, emotionLogs);

  const assessment = await RiskAssessment.create({
    user: req.user.id,
    riskScore: result.riskScore,
    level: result.level,
    triggerFactors: result.isPlaceholder ? "ยังไม่เปิดใช้งานการวิเคราะห์ด้วย AI (placeholder)" : result.triggerFactors,
  });

  res.status(201).json(assessment);
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
