import RiskAssessment from "../models/RiskAssessment.js";
import { runRiskAssessment } from "../services/riskAssessmentService.js";

export async function getMyRisk(req, res) {
  const assessment = await runRiskAssessment(req.user.id);
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
