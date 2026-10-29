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
        "familyRequest",
        "report",
        "moderation",
        "courseExpiry",
        "contentExpiry",
      ],
    },
    status: { type: String, enum: ["unread", "read"], default: "unread" },
    // จุดหมายเมื่อกดการแจ้งเตือน (ไม่บังคับ)
    link: { type: String },
    // วันตามปฏิทิน Asia/Bangkok ใช้กันการแจ้งเตือนซ้ำที่ส่งได้วันละครั้ง (เช่น การเตือน)
    dateKey: { type: String },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, status: 1, createdAt: -1 });
// การแจ้งเตือนที่เก่ากว่า 90 วันจะถูกลบอัตโนมัติ
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export default mongoose.model("Notification", notificationSchema);
