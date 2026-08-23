import mongoose from "mongoose";

const counsellingSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // no counsellor role/dashboard exists yet to pick up sessions, so this stays unset until that ships
    counsellor: { type: mongoose.Schema.Types.ObjectId, ref: "Counsellor" },
    // hotline/video only reference out to external services (Line/Meet)
    sessionType: { type: String, enum: ["chat", "hotline", "video"] },
    status: { type: String, enum: ["pending", "active", "closed"], default: "pending" },
    message: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CounsellingSession", counsellingSessionSchema);
