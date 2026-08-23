import EmotionLog from "../models/EmotionLog.js";
import Notification from "../models/Notification.js";
import { toBangkokDateKey } from "../utils/dateKey.js";
import { notifyUser } from "./notificationService.js";

// Nudges a "user"-role account to check in once per day, on sign-in — there's no
// scheduled-job infra in this backend yet, so login is the natural, reliable hook
// instead of a cron (and LINE Notify itself was shut down by LINE in 2025, so this
// stays an in-app notification rather than a push message).
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
