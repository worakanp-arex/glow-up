import mongoose from "mongoose";

const activityMissionLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    activityMission: { type: mongoose.Schema.Types.ObjectId, ref: "ActivityMission", required: true },
    // สำเนาจาก ActivityMission.category ตอนบันทึก (ดู MissionCategory)
    category: { type: String, required: true },
    dateKey: { type: String, required: true },
    durationMinutes: { type: Number },
    distanceKm: { type: Number },
    fatigueLevel: { type: Number, min: 1, max: 5 },
    enjoymentLevel: { type: Number, min: 1, max: 5 },
    note: { type: String },
    pointsAwarded: { type: Number, required: true },
    // สำเนาจาก ActivityMission.requiresApproval ตอนบันทึก
    requiresApproval: { type: Boolean, default: false },
    // null = รอตรวจ, true = อนุมัติ (นับคะแนน), false = ปฏิเสธ
    approved: { type: Boolean, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    // เหตุผลที่ปฏิเสธบันทึก (แสดงให้ผู้ใช้เห็นในการแจ้งเตือน)
    reviewNote: { type: String },
  },
  { timestamps: true }
);

activityMissionLogSchema.index({ user: 1, activityMission: 1, dateKey: 1 }, { unique: true });

export default mongoose.model("ActivityMissionLog", activityMissionLogSchema);
