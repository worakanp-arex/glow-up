import mongoose from "mongoose";

const microLessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    category: { type: String },
    // Who this lesson is written for — lets the family/caregiver guide reuse
    // the same lesson system without mixing into the recovering user's list.
    audience: { type: String, enum: ["user", "family"], default: "user" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("MicroLesson", microLessonSchema);
