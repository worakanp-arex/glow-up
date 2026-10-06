import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, createdAt: 1 });

export default mongoose.model("Comment", commentSchema);
