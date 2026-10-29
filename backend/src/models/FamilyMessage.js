import mongoose from "mongoose";

// ข้อความสั้นๆ ระหว่างผู้ฟื้นฟูกับสมาชิกครอบครัวที่เชื่อมต่อกันอยู่ ส่งได้ทั้งสองฝ่าย
// ประวัติอยู่กับลิงก์แม้การแจ้งเตือนที่ประกาศข้อความนั้นจะถูกล้างหรือหมดอายุแล้ว
const familyMessageSchema = new mongoose.Schema(
  {
    familyLink: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyLink", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // "family" = ผู้ติดตาม, "user" = ผู้ฟื้นฟู
    senderRole: { type: String, enum: ["family", "user"], required: true },
    content: { type: String, required: true, maxlength: 500 },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMessage" },
    // ตั้งค่าเมื่ออีกฝ่ายเปิดอ่าน/รับทราบแล้ว
    readAt: { type: Date },
  },
  { timestamps: true }
);

familyMessageSchema.index({ familyLink: 1, createdAt: -1 });

export default mongoose.model("FamilyMessage", familyMessageSchema);
