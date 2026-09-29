import { Router } from "express";
import { body } from "express-validator";
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
import { validate } from "../middleware/validate.js";
import { objectIdParam, paginationQuery } from "../middleware/validators.js";

const router = Router();

const STAFF_ROLES = ["counsellor", "admin"];
const VISIBLE_TO_ROLES = ["user", "family", "employer"];

const POST_BODY = [
  body("content").trim().notEmpty().isLength({ max: 5000 }),
  body("tags").optional().isArray({ max: 20 }),
  body("tags.*").optional().isString().trim().isLength({ max: 50 }),
  body("commentsEnabled").optional().isBoolean(),
  body("visibleToRoles").optional().isArray({ max: VISIBLE_TO_ROLES.length }),
  body("visibleToRoles.*").optional().isIn(VISIBLE_TO_ROLES),
];
const POST_BODY_UPDATE = [
  body("content").optional().trim().notEmpty().isLength({ max: 5000 }),
  body("tags").optional().isArray({ max: 20 }),
  body("tags.*").optional().isString().trim().isLength({ max: 50 }),
  body("commentsEnabled").optional().isBoolean(),
  body("visibleToRoles").optional().isArray({ max: VISIBLE_TO_ROLES.length }),
  body("visibleToRoles.*").optional().isIn(VISIBLE_TO_ROLES),
];
const COMMENT_BODY = [body("content").trim().notEmpty().isLength({ max: 2000 })];

router.get("/", verifyToken, [...paginationQuery()], validate, asyncHandler(listPosts));
router.get("/mine", verifyToken, requireRole(...STAFF_ROLES), [...paginationQuery()], validate, asyncHandler(myPosts));
router.get("/saved", verifyToken, [...paginationQuery()], validate, asyncHandler(mySavedPosts));
router.get(
  "/flagged",
  verifyToken,
  requireRole(...STAFF_ROLES),
  [...paginationQuery()],
  validate,
  asyncHandler(listFlaggedPosts)
);
router.get("/:id", verifyToken, [objectIdParam("id")], validate, asyncHandler(getPost));
router.post("/", verifyToken, requireRole(...STAFF_ROLES), POST_BODY, validate, asyncHandler(createPost));
router.put(
  "/:id",
  verifyToken,
  requireRole(...STAFF_ROLES),
  [objectIdParam("id"), ...POST_BODY_UPDATE],
  validate,
  asyncHandler(updatePost)
);
router.delete("/:id", verifyToken, requireRole(...STAFF_ROLES), [objectIdParam("id")], validate, asyncHandler(deletePost));
router.post(
  "/:id/comments",
  verifyToken,
  [objectIdParam("id"), ...COMMENT_BODY],
  validate,
  asyncHandler(addComment)
);
router.put(
  "/:id/comments/:commentId",
  verifyToken,
  [objectIdParam("id"), objectIdParam("commentId"), ...COMMENT_BODY],
  validate,
  asyncHandler(updateComment)
);
router.delete(
  "/:id/comments/:commentId",
  verifyToken,
  [objectIdParam("id"), objectIdParam("commentId")],
  validate,
  asyncHandler(deleteComment)
);
router.put(
  "/:id/like",
  verifyToken,
  [objectIdParam("id"), body("liked").optional().isBoolean()],
  validate,
  asyncHandler(likePost)
);
router.put("/:id/save", verifyToken, [objectIdParam("id")], validate, asyncHandler(toggleSavePost));
router.put("/:id/flag", verifyToken, [objectIdParam("id")], validate, asyncHandler(flagPostForReview));
router.put(
  "/:id/unflag",
  verifyToken,
  requireRole(...STAFF_ROLES),
  [objectIdParam("id")],
  validate,
  asyncHandler(clearPostFlag)
);

export default router;
