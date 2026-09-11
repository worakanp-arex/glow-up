import mongoose from "mongoose";

const userRewardSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reward: { type: mongoose.Schema.Types.ObjectId, ref: "Reward", required: true },
    earnedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userRewardSchema.index({ user: 1, reward: 1 }, { unique: true });

export default mongoose.model("UserReward", userRewardSchema);
