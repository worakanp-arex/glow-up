import mongoose from "mongoose";

const lineNotifyLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String },
    status: { type: String, enum: ["sent", "failed"] },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("LineNotifyLog", lineNotifyLogSchema);
