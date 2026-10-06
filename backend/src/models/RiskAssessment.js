import mongoose from "mongoose";

const riskAssessmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    riskScore: { type: Number },
    level: { type: String, enum: ["low", "medium", "high"] },
    triggerFactors: { type: String },
  },
  { timestamps: true }
);

riskAssessmentSchema.index({ user: 1, createdAt: -1 });
// Assessments are recomputed on every check-in; keep 90 days of history.
riskAssessmentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export default mongoose.model("RiskAssessment", riskAssessmentSchema);
