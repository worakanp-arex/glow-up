import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import SavedPost from "../models/SavedPost.js";

const USER_PUBLIC_FIELDS = "name role avatarUrl specialization";

function serializePost(post, userId, savedIds) {
  const obj = post.toObject ? post.toObject() : post;
  const likedByMe = Boolean(userId) && (obj.likedBy || []).some((id) => id.toString() === userId);
  const savedByMe = Boolean(savedIds) && savedIds.has(obj._id.toString());
  delete obj.likedBy;
  return { ...obj, likedByMe, savedByMe };
}

async function withCommentCount(post, userId, savedIds) {
  const commentCount = await Comment.countDocuments({ post: post._id });
  return { ...serializePost(post, userId, savedIds), commentCount };
}

async function getSavedIdSet(userId) {
  const saved = await SavedPost.find({ user: userId }).select("post");
  return new Set(saved.map((s) => s.post.toString()));
}

export async function listPosts(req, res) {
  const [posts, savedIds] = await Promise.all([
    Post.find().populate("user", USER_PUBLIC_FIELDS).sort({ createdAt: -1 }),
    getSavedIdSet(req.user.id),
  ]);
  res.json(await Promise.all(posts.map((post) => withCommentCount(post, req.user.id, savedIds))));
}

export async function myPosts(req, res) {
  const [posts, savedIds] = await Promise.all([
    Post.find({ user: req.user.id }).populate("user", USER_PUBLIC_FIELDS).sort({ createdAt: -1 }),
    getSavedIdSet(req.user.id),
  ]);
  res.json(await Promise.all(posts.map((post) => withCommentCount(post, req.user.id, savedIds))));
}

// Preserves the user's save order (most-recently-saved first) rather than
// falling back to the posts' own createdAt order.
export async function mySavedPosts(req, res) {
  const saved = await SavedPost.find({ user: req.user.id }).sort({ createdAt: -1 });
  const postIds = saved.map((s) => s.post);
  const posts = await Post.find({ _id: { $in: postIds } }).populate("user", USER_PUBLIC_FIELDS);
  const postById = new Map(posts.map((p) => [p._id.toString(), p]));
  const savedIds = new Set(postIds.map((id) => id.toString()));
  const ordered = postIds.map((id) => postById.get(id.toString())).filter(Boolean);
  res.json(await Promise.all(ordered.map((post) => withCommentCount(post, req.user.id, savedIds))));
}

export async function getPost(req, res) {
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    { $inc: { views: 1 } },
    { new: true }
  ).populate("user", USER_PUBLIC_FIELDS);
  if (!post) {
    return res.status(404).json({ message: "Not found" });
  }

  const comments = await Comment.find({ post: post._id })
    .populate("user", USER_PUBLIC_FIELDS)
    .sort({ createdAt: 1 });
  const savedIds = await getSavedIdSet(req.user.id);

  res.json({ ...serializePost(post, req.user.id, savedIds), comments });
}

export async function createPost(req, res) {
  const { content, tags, commentsEnabled } = req.body;
  const post = await Post.create({
    user: req.user.id,
    content,
    tags: Array.isArray(tags) ? tags : [],
    commentsEnabled: commentsEnabled !== undefined ? Boolean(commentsEnabled) : true,
  });
  await post.populate("user", USER_PUBLIC_FIELDS);
  res.status(201).json({ ...serializePost(post, req.user.id), commentCount: 0 });
}

export async function updatePost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ message: "Not found" });
  }
  if (post.user.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { content, tags, commentsEnabled } = req.body;
  if (content !== undefined) post.content = content;
  if (tags !== undefined) post.tags = Array.isArray(tags) ? tags : [];
  if (commentsEnabled !== undefined) post.commentsEnabled = Boolean(commentsEnabled);
  await post.save();
  await post.populate("user", USER_PUBLIC_FIELDS);

  res.json(await withCommentCount(post, req.user.id));
}

export async function deletePost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ message: "Not found" });
  }
  if (post.user.toString() !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  await Post.findByIdAndDelete(post._id);
  await Comment.deleteMany({ post: post._id });
  await SavedPost.deleteMany({ post: post._id });

  res.status(204).send();
}

export async function addComment(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ message: "Not found" });
  }
  if (!post.commentsEnabled) {
    return res.status(403).json({ message: "โพสต์นี้ปิดการแสดงความคิดเห็น" });
  }

  const comment = await Comment.create({ post: post._id, user: req.user.id, content: req.body.content });
  await comment.populate("user", USER_PUBLIC_FIELDS);
  res.status(201).json(comment);
}

export async function updateComment(req, res) {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment || comment.post.toString() !== req.params.id) {
    return res.status(404).json({ message: "Not found" });
  }
  if (comment.user.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  comment.content = req.body.content;
  await comment.save();
  await comment.populate("user", USER_PUBLIC_FIELDS);
  res.json(comment);
}

export async function deleteComment(req, res) {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment || comment.post.toString() !== req.params.id) {
    return res.status(404).json({ message: "Not found" });
  }

  const post = await Post.findById(req.params.id);
  const isCommentOwner = comment.user.toString() === req.user.id;
  const isPostOwner = post && post.user.toString() === req.user.id;
  if (!isCommentOwner && !isPostOwner && req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  await Comment.findByIdAndDelete(comment._id);
  res.status(204).send();
}

export async function likePost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ message: "Not found" });
  }

  const alreadyLiked = post.likedBy.some((id) => id.toString() === req.user.id);
  const update = alreadyLiked
    ? { $pull: { likedBy: req.user.id }, $inc: { likes: -1 } }
    : { $addToSet: { likedBy: req.user.id }, $inc: { likes: 1 } };

  const updated = await Post.findByIdAndUpdate(req.params.id, update, { new: true });
  const savedIds = await getSavedIdSet(req.user.id);
  res.json(serializePost(updated, req.user.id, savedIds));
}

export async function toggleSavePost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ message: "Not found" });
  }

  const existing = await SavedPost.findOne({ user: req.user.id, post: post._id });
  if (existing) {
    await SavedPost.deleteOne({ _id: existing._id });
    return res.json({ savedByMe: false });
  }
  await SavedPost.create({ user: req.user.id, post: post._id });
  res.json({ savedByMe: true });
}
