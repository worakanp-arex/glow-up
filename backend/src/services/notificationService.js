import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { emitToUser } from "./socket.js";

export async function notifyUser(userId, message, type, extra = {}) {
  const notification = await Notification.create({ user: userId, message, type, ...extra });
  emitToUser(userId, "notification", notification);
  return notification;
}

// แจ้งแอดมินและผู้ให้คำปรึกษาทุกคน (ผู้ที่กลั่นกรองเนื้อหา)
export async function notifyStaff(message, type, extra = {}) {
  const staff = await User.find({ role: { $in: ["admin", "counsellor"] } }).select("_id");
  return Promise.all(staff.map((member) => notifyUser(member._id, message, type, extra)));
}

// การแจ้งเตือนความปลอดภัยเรื่องเดียวกันของผู้ป่วยคนหนึ่งจะไม่ซ้ำภายในช่วงเวลานี้
export const RISK_ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// แจ้งผู้ที่รับผิดชอบผู้ป่วยหนึ่งคน: แอดมินและผู้ให้คำปรึกษา
// ที่ได้รับมอบหมาย ระหว่างที่ยังไม่มีผู้รับผิดชอบ จะแจ้งผู้ให้คำปรึกษาทุกคน เพื่อให้
// มีคนรับเรื่อง — การแจ้งเตือนความปลอดภัยต้องไม่ไปถึงใครเลยไม่ได้
export async function notifyCareTeam(patientId, message, type, extra = {}) {
  const patient = await User.findById(patientId).select("assignedCounsellor");
  const staff = await User.find(
    patient?.assignedCounsellor
      ? { $or: [{ role: "admin" }, { _id: patient.assignedCounsellor }] }
      : { role: { $in: ["admin", "counsellor"] } }
  ).select("_id");
  return Promise.all(staff.map((member) => notifyUser(member._id, message, type, extra)));
}
