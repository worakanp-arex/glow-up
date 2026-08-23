import { Router } from "express";
import {
  listPosts,
  myPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  addComment,
  updateComment,
  deleteComment,
  likePost,
} from "../controllers/postController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", verifyToken, asyncHandler(listPosts));
router.get("/mine", verifyToken, requireRole("user"), asyncHandler(myPosts));
router.get("/:id", verifyToken, asyncHandler(getPost));
router.post("/", verifyToken, requireRole("user"), asyncHandler(createPost));
router.put("/:id", verifyToken, requireRole("user"), asyncHandler(updatePost));
router.delete("/:id", verifyToken, requireRole("user"), asyncHandler(deletePost));
router.post("/:id/comments", verifyToken, requireRole("user"), asyncHandler(addComment));
router.put("/:id/comments/:commentId", verifyToken, requireRole("user"), asyncHandler(updateComment));
router.delete("/:id/comments/:commentId", verifyToken, requireRole("user"), asyncHandler(deleteComment));
router.put("/:id/like", verifyToken, asyncHandler(likePost));

export default router;
