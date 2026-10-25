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
