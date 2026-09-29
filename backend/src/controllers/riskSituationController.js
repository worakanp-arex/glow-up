import RiskSituationLog from "../models/RiskSituationLog.js";
import User from "../models/User.js";
import { notifyUser } from "../services/notificationService.js";
import { counsellorCanAccessPatient } from "../utils/patientAccess.js";

export async function createRiskSituationLog(req, res) {
  const { situation, skillUsed, skillDescription, outcome, occurredAt } = req.body;
  const log = await RiskSituationLog.create({
    user: req.user.id,
    situation,
    skillUsed: Boolean(skillUsed),
    skillDescription,
    outcome,
    occurredAt,
  });

  // A logged relapse is safety-relevant the same way a self-harm risk flag
  // is — alert every admin/counsellor so a real person can follow up.
  if (outcome === "relapsed") {
    const [staff, reportingUser] = await Promise.all([
      User.find({ role: { $in: ["admin", "counsellor"] } }).select("_id"),
      User.findById(req.user.id).select("name"),
    ]);
    for (const member of staff) {
      await notifyUser(
        member._id,
        `แจ้งเตือนความเสี่ยง: ${reportingUser.name} บันทึกว่ากลับไปใช้ซ้ำในสถานการณ์เสี่ยงที่พบจริง`,
        "riskAlert",
        { link: `/counsellor/patients/${req.user.id}` }
      );
    }
  }

  res.status(201).json(log);
}

export async function myRiskSituationLogs(req, res) {
  const logs = await RiskSituationLog.find({ user: req.user.id }).sort({ occurredAt: -1 });
  res.json(logs);
}

export async function getRiskSituationLogsForUser(req, res) {
  const targetUser = await User.findById(req.params.userId).select("role");
  if (!targetUser || targetUser.role !== "user") {
    return res.status(404).json({ message: "ไม่พบผู้ใช้งานนี้" });
  }
  if (req.user.role === "counsellor" && !(await counsellorCanAccessPatient(req.user.id, targetUser._id))) {
    return res.status(403).json({ message: "คุณไม่ได้รับมอบหมายให้ดูแลผู้ใช้งานนี้" });
  }
  const logs = await RiskSituationLog.find({ user: targetUser._id }).sort({ occurredAt: -1 });
  res.json(logs);
}
