import Notification from "../models/Notification.js";
import { paginationOptions } from "../utils/pagination.js";

export async function myNotifications(req, res) {
  const filter = { user: req.user.id };
  const pagination = paginationOptions(req.query);
  const query = Notification.find(filter).sort({ createdAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await Notification.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  res.json(await query);
}

export async function markAsRead(req, res) {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { status: "read" },
    { new: true }
  );
  if (!notification) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(notification);
}

export async function markAllAsRead(req, res) {
  await Notification.updateMany({ user: req.user.id, status: "unread" }, { $set: { status: "read" } });
  res.json({ success: true });
}

export async function clearMyNotifications(req, res) {
  await Notification.deleteMany({ user: req.user.id });
  res.status(204).send();
}
