import RiskSituationLog from "../models/RiskSituationLog.js";
import User from "../models/User.js";
import { notifyCareTeam, RISK_ALERT_COOLDOWN_MS } from "../services/notificationService.js";
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

  // การบันทึกว่ากลับไปใช้ซ้ำเกี่ยวกับความปลอดภัยเช่นเดียวกับสัญญาณเสี่ยง
  // ทำร้ายตนเอง — แจ้งทีมดูแลของผู้ป่วยเพื่อให้คนจริงๆ ติดตามต่อ ทุก
  // รายการอยู่ในประวัติของผู้ป่วย แต่เฉพาะการกลับไปใช้ซ้ำครั้งแรกใน
  // ช่วงพักเท่านั้นที่แจ้งทีม
  if (outcome === "relapsed") {
    const alertedRecently = await RiskSituationLog.exists({
      user: req.user.id,
      outcome: "relapsed",
      _id: { $ne: log._id },
      createdAt: { $gte: new Date(Date.now() - RISK_ALERT_COOLDOWN_MS) },
    });
    if (!alertedRecently) {
      const reportingUser = await User.findById(req.user.id).select("name");
      await notifyCareTeam(
        req.user.id,
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
