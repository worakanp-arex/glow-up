import Notification from "../models/Notification.js";
import { emitToUser } from "./socket.js";

export async function notifyUser(userId, message, type, extra = {}) {
  const notification = await Notification.create({ user: userId, message, type, ...extra });
  emitToUser(userId, "notification", notification);
  return notification;
}
