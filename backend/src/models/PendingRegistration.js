import mongoose from "mongoose";

const pendingRegistrationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    otpHash: { type: String, required: true },
    passwordHash: { type: String, required: true, select: false },
    // SHA-256 ของความลับที่ส่งให้เฉพาะเบราว์เซอร์ที่ขอสมัครครั้งนี้
    // หากไม่มี คนอื่นจะแทนที่หรือทำคำขอที่รออยู่ของอีเมลนี้ให้เสร็จไม่ได้
    registrationTokenHash: { type: String, select: false },
    otpExpiresAt: { type: Date, required: true },
    lastSentAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    // ตาข่ายนิรภัยสำหรับล้างข้อมูลแบบเด็ดขาด ไม่ขึ้นกับ otpExpiresAt เผื่อกรณีส่งรหัสซ้ำหลายครั้ง
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("PendingRegistration", pendingRegistrationSchema);
