import mongoose from "mongoose";

const riskSituationLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // What happened, in the user's own words.
    situation: { type: String, required: true },
    skillUsed: { type: Boolean, required: true },
    // Which coping/refusal skill they used, if any.
    skillDescription: { type: String },
    outcome: { type: String, enum: ["handled_well", "partially_handled", "relapsed"], required: true },
    occurredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

riskSituationLogSchema.index({ user: 1, occurredAt: -1 });

export default mongoose.model("RiskSituationLog", riskSituationLogSchema);
