import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    tags: { type: [String], default: [] },
    externalUrl: { type: String, required: true },
    // External course links expire. Both dates are optional; `endDate` is the
    // last instant (Bangkok end of day) the course can still be taken.
    startDate: { type: Date },
    endDate: { type: Date },
    // Either a built-in image path (/images/...) or an uploaded one (/uploads/course-covers/...).
    coverImage: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Course", courseSchema);
