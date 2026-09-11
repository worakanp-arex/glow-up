import mongoose from "mongoose";

const scenarioAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    scenario: { type: mongoose.Schema.Types.ObjectId, ref: "ScenarioSimulation", required: true },
    chosenOptionIndex: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("ScenarioAttempt", scenarioAttemptSchema);
