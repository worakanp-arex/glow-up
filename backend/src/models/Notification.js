import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String },
    type: {
      type: String,
      enum: [
        "job",
        "craving",
        "system",
        "reminder",
        "news",
        "counselling",
        "reward",
        "milestone",
        "riskAlert",
        "familyMessage",
        "familyLinkRemoved",
      ],
    },
    status: { type: String, enum: ["unread", "read"], default: "unread" },
    // where clicking the notification should take the user (optional)
    link: { type: String },
    // Asia/Bangkok calendar day, used to dedupe once-per-day notifications (e.g. reminder)
    dateKey: { type: String },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, status: 1, createdAt: -1 });
// Notifications older than 90 days are purged automatically.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export default mongoose.model("Notification", notificationSchema);
