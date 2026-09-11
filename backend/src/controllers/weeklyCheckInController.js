import WeeklyCheckIn from "../models/WeeklyCheckIn.js";
import User from "../models/User.js";
import { toIsoWeekKey } from "../utils/dateKey.js";
import { notifyUser } from "../services/notificationService.js";

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

  // Safety-critical path: immediately alert every admin/counsellor account
  // when self-harm risk is flagged — there's no existing risk-assessment
  // alert mechanism to reuse (RiskAssessment is on-demand and passive).
  if (checkIn.selfHarmRiskFlag) {
    const staff = await User.find({ role: { $in: ["admin", "counsellor"] } }).select("_id");
    const requestingUser = await User.findById(req.user.id).select("name");
    for (const member of staff) {
      await notifyUser(
        member._id,
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
  const checkIns = await WeeklyCheckIn.find({ user: targetUser._id }).sort({ createdAt: -1 });
  res.json(checkIns);
}
