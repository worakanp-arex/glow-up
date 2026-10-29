import mongoose from "mongoose";

const missionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ["streak", "totalCheckins", "scenarioCompleted", "custom"],
      required: true,
    },
    // ค่าของตัวชี้วัดที่ติดตามซึ่งทำให้ภารกิจสำเร็จ (เช่น สตรีค 7 วัน
    // เช็คอินรวม 30 ครั้ง ผ่านสถานการณ์ 1 ครั้ง)
    targetValue: { type: Number, required: true },
    rewardPoints: { type: Number, default: 0 },
    badgeIcon: { type: String },
    active: { type: Boolean, default: true },
    // ลำดับการแสดงบนบอร์ดของผู้ใช้ (น้อยก่อน) และช่วงเวลาที่ไม่บังคับ
    // ซึ่งภารกิจยังมีความคืบหน้าได้ ภารกิจที่สำเร็จแล้วยังเก็บ
    // คะแนนไว้แม้ช่วงเวลาจะปิดแล้ว
    order: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Mission", missionSchema);
