import mongoose from "mongoose";

const scenarioSimulationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "MicroLesson" },
    prompt: { type: String, required: true },
    options: [
      {
        text: { type: String, required: true },
        isCorrect: { type: Boolean, default: false },
        feedback: { type: String },
      },
    ],
    active: { type: Boolean, default: true },
    // Last day the scenario can be played; unset means it never expires.
    expiresAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("ScenarioSimulation", scenarioSimulationSchema);
