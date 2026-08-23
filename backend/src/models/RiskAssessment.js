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

export default mongoose.model("RiskAssessment", riskAssessmentSchema);
