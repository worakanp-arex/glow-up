import EmotionLog from "../models/EmotionLog.js";
import RiskAssessment from "../models/RiskAssessment.js";
import User from "../models/User.js";
import { assessRisk } from "./riskPredictionService.js";
import { notifyUser } from "./notificationService.js";
import { toBangkokDateKey } from "../utils/dateKey.js";

// Recomputes and stores a user's rule-based risk level from their recent
// emotion logs, and pages every admin/counsellor the first time a day's
// assessment comes back "high". EmotionLog only allows one entry per day, so
// calling this from the daily check-in flow naturally throttles alerts to at
// most once per user per day.
export async function runRiskAssessment(userId) {
  const emotionLogs = await EmotionLog.find({ user: userId }).sort({ date: -1 }).limit(30);
  const result = await assessRisk(null, emotionLogs);

  const assessment = await RiskAssessment.create({
    user: userId,
    riskScore: result.riskScore,
    level: result.level,
    triggerFactors: result.triggerFactors,
  });

  if (result.level === "high") {
    const todayKey = toBangkokDateKey(new Date());
    const alreadyAlertedToday = await RiskAssessment.exists({
      user: userId,
      level: "high",
      _id: { $ne: assessment._id },
      createdAt: { $gte: new Date(`${todayKey}T00:00:00+07:00`) },
    });
    if (!alreadyAlertedToday) {
      const [staff, targetUser] = await Promise.all([
        User.find({ role: { $in: ["admin", "counsellor"] } }).select("_id"),
        User.findById(userId).select("name"),
      ]);
      for (const member of staff) {
        await notifyUser(
          member._id,
          `แจ้งเตือนความเสี่ยง: ระบบประเมินว่า ${targetUser.name} มีความเสี่ยงสูงจากข้อมูลอารมณ์/ความอยากล่าสุด`,
          "riskAlert",
          { link: `/counsellor/patients/${userId}` }
        );
      }
    }
  }

  return assessment;
}
