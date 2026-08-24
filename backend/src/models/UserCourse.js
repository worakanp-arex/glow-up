import mongoose from "mongoose";

const userCourseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    certificateUrl: { type: String },
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("UserCourse", userCourseSchema);
