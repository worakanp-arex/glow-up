import EmotionLog from "../models/EmotionLog.js";
import Notification from "../models/Notification.js";
import { toBangkokDateKey } from "../utils/dateKey.js";
import { notifyUser } from "./notificationService.js";

// เตือนบัญชีบทบาท "user" ให้เช็คอินวันละครั้งตอนล็อกอิน — backend นี้ยังไม่มี
// โครงสร้างงานตามเวลา การล็อกอินจึงเป็นจุดเกาะที่เป็นธรรมชาติและเชื่อถือได้
// แทน cron (และ LINE Notify เองถูก LINE ยุติบริการในปี 2025 จึง
// ใช้การแจ้งเตือนในแอปแทนการส่ง push)
export async function maybeSendDailyReminder(user) {
  if (user.role !== "user") return;

  const dateKey = toBangkokDateKey(new Date());

  const [loggedToday, alreadyReminded] = await Promise.all([
    EmotionLog.exists({ user: user._id, dateKey }),
    Notification.exists({ user: user._id, type: "reminder", dateKey }),
  ]);

  if (loggedToday || alreadyReminded) return;

  await notifyUser(
    user._id,
    "อย่าลืมบันทึกอารมณ์วันนี้ เพื่อรักษาสถิติต่อเนื่องของคุณไว้ 🌱",
    "reminder",
    { dateKey, link: "/craving-tracker" }
  );
}
