import mongoose from "mongoose";

const activityMissionLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    activityMission: { type: mongoose.Schema.Types.ObjectId, ref: "ActivityMission", required: true },
    category: {
      type: String,
      enum: ["routine", "physical", "learning", "self_awareness", "coping", "self_monitoring", "social", "mindfulness"],
      required: true,
    },
    dateKey: { type: String, required: true },
    durationMinutes: { type: Number },
    distanceKm: { type: Number },
    fatigueLevel: { type: Number, min: 1, max: 5 },
    enjoymentLevel: { type: Number, min: 1, max: 5 },
    note: { type: String },
    pointsAwarded: { type: Number, required: true },
  },
  { timestamps: true }
);

activityMissionLogSchema.index({ user: 1, activityMission: 1, dateKey: 1 }, { unique: true });

export default mongoose.model("ActivityMissionLog", activityMissionLogSchema);
