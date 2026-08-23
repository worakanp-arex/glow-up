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
