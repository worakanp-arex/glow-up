import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String },
    type: { type: String, enum: ["job", "craving", "system", "reminder", "news", "counselling"] },
    status: { type: String, enum: ["unread", "read"], default: "unread" },
    // where clicking the notification should take the user (optional)
    link: { type: String },
    // Asia/Bangkok calendar day, used to dedupe once-per-day notifications (e.g. reminder)
    dateKey: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
