import mongoose from "mongoose";

const pendingRegistrationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    otpHash: { type: String, required: true },
    passwordHash: { type: String, required: true, select: false },
    // SHA-256 of a secret handed only to the browser that asked for this
    // registration. Without it nobody else can replace or complete the pending
    // request for this email address.
    registrationTokenHash: { type: String, select: false },
    otpExpiresAt: { type: Date, required: true },
    lastSentAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    // hard cleanup safety net independent of otpExpiresAt, in case of repeated resends
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("PendingRegistration", pendingRegistrationSchema);
