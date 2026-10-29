import mongoose from "mongoose";

// แคตตาล็อกภารกิจร่วมที่ผู้ฟื้นฟูกับสมาชิกครอบครัวที่เชื่อมต่อกัน
// ทำด้วยกันได้ — แยกจากแคตตาล็อก Mission/ActivityMission แบบทำคนเดียว
// เพราะการทำให้สำเร็จต้องได้รับการยืนยันจากทั้งสองฝ่าย
const familyMissionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    points: { type: Number, default: 10 },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("FamilyMission", familyMissionSchema);
