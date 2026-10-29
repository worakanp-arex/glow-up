import mongoose from "mongoose";

// ความพยายามหนึ่งครั้งของภารกิจร่วมในวันหนึ่ง — จะสำเร็จก็ต่อเมื่อ
// ทั้งผู้ฟื้นฟูและสมาชิกครอบครัวที่เชื่อมต่อกันยืนยันแล้ว
const familyMissionLogSchema = new mongoose.Schema(
  {
    familyLink: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyLink", required: true },
    // สำเนาจาก familyLink.recoveringUser เพื่อให้ getTotalPoints() รวมคะแนน
    // ภารกิจครอบครัวที่สำเร็จของผู้ใช้ได้ด้วย query เดียวที่มี index
    // รูปแบบเดียวกับแหล่งคะแนนอื่น แทนการค้น FamilyLink
    // ทุกครั้งที่คำนวณคะแนน
    recoveringUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    familyMission: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMission", required: true },
    dateKey: { type: String, required: true },
    userConfirmed: { type: Boolean, default: false },
    userConfirmedAt: { type: Date },
    familyConfirmed: { type: Boolean, default: false },
    familyConfirmedAt: { type: Date },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    pointsAwarded: { type: Number, default: 0 },
  },
  { timestamps: true }
);

familyMissionLogSchema.index({ familyLink: 1, familyMission: 1, dateKey: 1 }, { unique: true });
familyMissionLogSchema.index({ recoveringUser: 1, completed: 1 });

export default mongoose.model("FamilyMissionLog", familyMissionLogSchema);
