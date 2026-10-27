import WeeklyCheckIn from "../models/WeeklyCheckIn.js";
import User from "../models/User.js";
import { toIsoWeekKey } from "../utils/dateKey.js";
import { notifyCareTeam, RISK_ALERT_COOLDOWN_MS } from "../services/notificationService.js";
import { counsellorCanAccessPatient } from "../utils/patientAccess.js";

export async function submitWeeklyCheckIn(req, res) {
  const { stressLevel, moodTrend, selfHarmRiskFlag, notes } = req.body;

  if (!Number.isInteger(Number(stressLevel)) || stressLevel < 1 || stressLevel > 5) {
    return res.status(400).json({ message: "กรุณาเลือกระดับความเครียด 1-5" });
  }
  if (!["improving", "stable", "worsening"].includes(moodTrend)) {
    return res.status(400).json({ message: "กรุณาเลือกแนวโน้มอารมณ์" });
  }

  const isoWeekKey = toIsoWeekKey(new Date());
  const checkIn = await WeeklyCheckIn.findOneAndUpdate(
    { user: req.user.id, isoWeekKey },
    { stressLevel, moodTrend, selfHarmRiskFlag: Boolean(selfHarmRiskFlag), notes, isoWeekKey },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  // Safety-critical path: immediately alert the patient's care team when
  // self-harm risk is flagged — there's no existing risk-assessment alert
  // mechanism to reuse (RiskAssessment is on-demand and passive). The alert is
  // claimed atomically so resubmitting the form can't page the team again
  // within the cooldown.
  if (checkIn.selfHarmRiskFlag) {
    const claimed = await WeeklyCheckIn.findOneAndUpdate(
      {
        _id: checkIn._id,
        selfHarmRiskFlag: true,
        $or: [{ riskAlertedAt: null }, { riskAlertedAt: { $lt: new Date(Date.now() - RISK_ALERT_COOLDOWN_MS) } }],
      },
      { riskAlertedAt: new Date() }
    );
    if (claimed) {
      const requestingUser = await User.findById(req.user.id).select("name");
      await notifyCareTeam(
        req.user.id,
        `แจ้งเตือนความเสี่ยง: ${requestingUser.name} รายงานความเสี่ยงทำร้ายตนเองในแบบประเมินรายสัปดาห์`,
        "riskAlert",
        { link: `/counsellor/patients/${req.user.id}` }
      );
    }
  }

  res.status(201).json(checkIn);
}

export async function myWeeklyCheckIns(req, res) {
  const checkIns = await WeeklyCheckIn.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(checkIns);
}

export async function getWeeklyCheckInsForUser(req, res) {
  const targetUser = await User.findById(req.params.userId).select("role");
  if (!targetUser || targetUser.role !== "user") {
    return res.status(404).json({ message: "ไม่พบผู้ใช้งานนี้" });
  }
  if (req.user.role === "counsellor" && !(await counsellorCanAccessPatient(req.user.id, targetUser._id))) {
    return res.status(403).json({ message: "คุณไม่ได้รับมอบหมายให้ดูแลผู้ใช้งานนี้" });
  }
  const checkIns = await WeeklyCheckIn.find({ user: targetUser._id }).sort({ createdAt: -1 });
  res.json(checkIns);
}
