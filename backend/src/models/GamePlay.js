import mongoose from "mongoose";

const gamePlaySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    gameType: { type: String, enum: ["wheel", "memory", "quiz"], required: true },
    dateKey: { type: String, required: true },
    domain: {
      type: String,
      enum: ["self_awareness", "coping", "routine", "physical", "learning", "self_monitoring"],
      required: true,
    },
    pointsAwarded: { type: Number, required: true },
    resultLabel: { type: String },
  },
  { timestamps: true }
);

gamePlaySchema.index({ user: 1, gameType: 1, dateKey: 1 }, { unique: true });

export default mongoose.model("GamePlay", gamePlaySchema);
