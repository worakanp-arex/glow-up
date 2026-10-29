import mongoose from "mongoose";

const activityMissionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    // อ้างอิง MissionCategory.key — ตรวจกับแคตตาล็อกที่แอดมินจัดการ
    // ที่ชั้น route (ดู activityMissionRoutes.js) แทน enum ของ Mongoose
    // ที่ฮาร์ดโค้ด เพราะแอดมินเพิ่ม/เปลี่ยนชื่อหมวดได้
    category: { type: String, required: true },
    icon: { type: String },
    points: { type: Number, default: 5 },
    // เมื่อเป็น true ผู้ให้คำปรึกษา/แอดมินต้องอนุมัติบันทึกของแต่ละวัน ก่อนที่
    // คะแนนจะนับรวมในคะแนนของผู้ใช้ (ดู ActivityMissionLog.approved)
    requiresApproval: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    // ช่วงเวลาที่ผู้คนบันทึกได้ (ไม่บังคับ) ตามขอบเขตวันของไทย
    startDate: { type: Date },
    endDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("ActivityMission", activityMissionSchema);
