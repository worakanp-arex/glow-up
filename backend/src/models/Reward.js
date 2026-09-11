import mongoose from "mongoose";

const rewardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    icon: { type: String },
    // Cumulative mission points required to unlock this reward tier.
    pointsRequired: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Reward", rewardSchema);
