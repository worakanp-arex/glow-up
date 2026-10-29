import mongoose from "mongoose";

const familyLinkSchema = new mongoose.Schema(
  {
    // ผู้ฟื้นฟูที่สมาชิกครอบครัวติดตามความก้าวหน้า
    recoveringUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // ตั้งค่าเมื่อรับคำเชิญแล้ว เป็น null ขณะที่ยังรออยู่
    familyUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // ใครเริ่มการเชื่อมต่อ "recovering" = ผู้ป่วยเชิญสมาชิกครอบครัว
    // ทางอีเมล "family" = สมาชิกครอบครัวขอติดตามผู้ป่วย
    // และผู้ป่วยต้องอนุมัติ (สถานะ "requested")
    initiatedBy: { type: String, enum: ["recovering", "family"], default: "recovering" },
    // คำเชิญจากผู้ป่วยคืออีเมลของผู้ถูกเชิญ ส่วนคำขอจากครอบครัวคือ
    // อีเมลของผู้ขอเอง
    inviteEmail: { type: String, required: true },
    inviteTokenHash: {
      type: String,
      required: function requiredForInvites() {
        return this.initiatedBy !== "family";
      },
      select: false,
    },
    inviteExpiresAt: {
      type: Date,
      required: function requiredForInvites() {
        return this.initiatedBy !== "family";
      },
    },
    status: { type: String, enum: ["pending", "requested", "active", "revoked"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("FamilyLink", familyLinkSchema);
