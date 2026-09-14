import Notification from "../models/Notification.js";

export async function myNotifications(req, res) {
  const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(notifications);
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
