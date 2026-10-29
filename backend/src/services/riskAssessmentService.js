import EmotionLog from "../models/EmotionLog.js";
import RiskAssessment from "../models/RiskAssessment.js";
import User from "../models/User.js";
import { assessRisk } from "./riskPredictionService.js";
import { notifyCareTeam } from "./notificationService.js";
import { toBangkokDateKey } from "../utils/dateKey.js";

// คำนวณใหม่และบันทึกระดับความเสี่ยงแบบอิงกฎของผู้ใช้จากบันทึกอารมณ์ล่าสุด
// และแจ้งแอดมิน/ผู้ให้คำปรึกษาทุกคนในครั้งแรกของวันที่ผลประเมินออกมาเป็น "high"
// EmotionLog อนุญาตหนึ่งรายการต่อวัน การเรียกจากขั้นตอนเช็คอินรายวัน
// จึงจำกัดการแจ้งเตือนได้เองเป็นอย่างมากหนึ่งครั้งต่อผู้ใช้ต่อวัน
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
      const targetUser = await User.findById(userId).select("name");
      await notifyCareTeam(
        userId,
        `แจ้งเตือนความเสี่ยง: ระบบประเมินว่า ${targetUser.name} มีความเสี่ยงสูงจากข้อมูลอารมณ์/ความอยากล่าสุด`,
        "riskAlert",
        { link: `/counsellor/patients/${userId}` }
      );
    }
  }

  return assessment;
}
