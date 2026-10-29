import mongoose from "mongoose";

const weeklyCheckInSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // สัปดาห์ ISO เช่น "2026-W37" — ส่งได้หนึ่งครั้งต่อผู้ใช้ต่อสัปดาห์
    isoWeekKey: { type: String, required: true },
    stressLevel: { type: Number, min: 1, max: 5, required: true },
    moodTrend: { type: String, enum: ["improving", "stable", "worsening"], required: true },
    selfHarmRiskFlag: { type: Boolean, default: false },
    // เวลาที่แจ้งทีมดูแลเรื่องเช็คอินนี้ล่าสุด เพื่อไม่ให้การส่งฟอร์มซ้ำ
    // แจ้งทุกคนอีกในช่วงพัก
    riskAlertedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

weeklyCheckInSchema.index({ user: 1, isoWeekKey: 1 }, { unique: true });

export default mongoose.model("WeeklyCheckIn", weeklyCheckInSchema);
