import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    status: {
      type: String,
      enum: ["pending", "interview", "passed", "rejected", "cancelled"],
      default: "pending",
    },
    rejectionReason: { type: String },
    employerFeedback: { type: String },
    appliedAt: { type: Date, default: Date.now },
    attachments: [{ name: String, url: String }],
  },
  { timestamps: true }
);

export default mongoose.model("Application", applicationSchema);
