import mongoose from "mongoose";

// ใครทำอะไรกับข้อมูลของใคร บันทึกเมื่อบัญชีถูกลบ กู้คืน หรือ
// ทำให้ไม่ระบุตัวตน และทุกครั้งที่แอดมินเปิดดูข้อมูลของบัญชีที่ถูกลบ
// เพื่อให้อธิบายการเข้าถึงข้อมูลสุขภาพที่เก็บไว้ได้เสมอ รายการมีแต่เพิ่ม
// ไม่มีการแก้ไข
const auditLogSchema = new mongoose.Schema(
  {
    // null เมื่อระบบทำงานเอง (งานเก็บรักษาข้อมูล)
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    action: {
      type: String,
      required: true,
      enum: ["account.deleted", "account.restored", "account.anonymized", "deleted-account.viewed"],
    },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ targetUser: 1, createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
