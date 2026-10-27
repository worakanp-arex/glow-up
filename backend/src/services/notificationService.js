import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { emitToUser } from "./socket.js";

export async function notifyUser(userId, message, type, extra = {}) {
  const notification = await Notification.create({ user: userId, message, type, ...extra });
  emitToUser(userId, "notification", notification);
  return notification;
}

// Notifies every admin and counsellor (the people who moderate content).
export async function notifyStaff(message, type, extra = {}) {
  const staff = await User.find({ role: { $in: ["admin", "counsellor"] } }).select("_id");
  return Promise.all(staff.map((member) => notifyUser(member._id, message, type, extra)));
}

// The same safety alert about one patient is not repeated within this window.
export const RISK_ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Tells the people responsible for one patient: the admins and the counsellor
// assigned to them. While nobody is assigned yet, every counsellor is told so a
// person can pick the case up — a safety alert must never reach nobody.
export async function notifyCareTeam(patientId, message, type, extra = {}) {
  const patient = await User.findById(patientId).select("assignedCounsellor");
  const staff = await User.find(
    patient?.assignedCounsellor
      ? { $or: [{ role: "admin" }, { _id: patient.assignedCounsellor }] }
      : { role: { $in: ["admin", "counsellor"] } }
  ).select("_id");
  return Promise.all(staff.map((member) => notifyUser(member._id, message, type, extra)));
}
