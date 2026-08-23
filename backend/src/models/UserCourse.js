import mongoose from "mongoose";

const userCourseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("UserCourse", userCourseSchema);
