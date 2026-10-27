import RiskAssessment from "../models/RiskAssessment.js";
import { runRiskAssessment } from "../services/riskAssessmentService.js";

// Computing an assessment stores a record and can page the care team, so it is
// a POST. A GET must never change anything: a link or image on another site can
// make a signed-in browser issue one.
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
