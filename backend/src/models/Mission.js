import mongoose from "mongoose";

const missionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ["streak", "totalCheckins", "scenarioCompleted", "custom"],
      required: true,
    },
    // What value of the tracked metric completes this mission (e.g. 7 days
    // of streak, 30 total check-ins, 1 scenario passed).
    targetValue: { type: Number, required: true },
    rewardPoints: { type: Number, default: 0 },
    badgeIcon: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Mission", missionSchema);
