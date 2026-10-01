import mongoose from "mongoose";

const savedLessonSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "MicroLesson", required: true },
  },
  { timestamps: true }
);

savedLessonSchema.index({ user: 1, lesson: 1 }, { unique: true });

export default mongoose.model("SavedLesson", savedLessonSchema);
