import { Router } from "express";
import {
  listPosts,
  myPosts,
  mySavedPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  addComment,
  updateComment,
  deleteComment,
  likePost,
  toggleSavePost,
  flagPostForReview,
  clearPostFlag,
  listFlaggedPosts,
} from "../controllers/postController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

const STAFF_ROLES = ["counsellor", "admin"];

router.get("/", verifyToken, asyncHandler(listPosts));
router.get("/mine", verifyToken, requireRole(...STAFF_ROLES), asyncHandler(myPosts));
router.get("/saved", verifyToken, asyncHandler(mySavedPosts));
router.get("/flagged", verifyToken, requireRole(...STAFF_ROLES), asyncHandler(listFlaggedPosts));
router.get("/:id", verifyToken, asyncHandler(getPost));
router.post("/", verifyToken, requireRole(...STAFF_ROLES), asyncHandler(createPost));
router.put("/:id", verifyToken, requireRole(...STAFF_ROLES), asyncHandler(updatePost));
router.delete("/:id", verifyToken, requireRole(...STAFF_ROLES), asyncHandler(deletePost));
router.post("/:id/comments", verifyToken, asyncHandler(addComment));
router.put("/:id/comments/:commentId", verifyToken, asyncHandler(updateComment));
router.delete("/:id/comments/:commentId", verifyToken, asyncHandler(deleteComment));
router.put("/:id/like", verifyToken, asyncHandler(likePost));
router.put("/:id/save", verifyToken, asyncHandler(toggleSavePost));
router.put("/:id/flag", verifyToken, asyncHandler(flagPostForReview));
router.put("/:id/unflag", verifyToken, requireRole(...STAFF_ROLES), asyncHandler(clearPostFlag));

export default router;
