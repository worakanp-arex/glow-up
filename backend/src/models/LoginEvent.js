import mongoose from "mongoose";

const loginEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dateKey: { type: String, required: true }, // Asia/Bangkok YYYY-MM-DD
  },
  { timestamps: true }
);

loginEventSchema.index({ user: 1, dateKey: 1 }, { unique: true });

export default mongoose.model("LoginEvent", loginEventSchema);
