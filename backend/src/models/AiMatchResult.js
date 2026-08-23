import mongoose from "mongoose";

const aiMatchResultSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    score: { type: Number },
    // JSON snapshot of the input features used for this match — not the model or training data
    featureSnapshot: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("AiMatchResult", aiMatchResultSchema);
