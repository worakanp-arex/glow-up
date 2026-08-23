import Post from "../models/Post.js";
import Comment from "../models/Comment.js";

const USER_PUBLIC_FIELDS = "name role avatarUrl";

function serializePost(post, userId) {
  const obj = post.toObject ? post.toObject() : post;
  const likedByMe = Boolean(userId) && (obj.likedBy || []).some((id) => id.toString() === userId);
  delete obj.likedBy;
  return { ...obj, likedByMe };
}

async function withCommentCount(post, userId) {
  const commentCount = await Comment.countDocuments({ post: post._id });
  return { ...serializePost(post, userId), commentCount };
}

export async function listPosts(req, res) {
  const posts = await Post.find().populate("user", USER_PUBLIC_FIELDS).sort({ createdAt: -1 });
  res.json(await Promise.all(posts.map((post) => withCommentCount(post, req.user.id))));
}

export async function myPosts(req, res) {
  const posts = await Post.find({ user: req.user.id }).populate("user", USER_PUBLIC_FIELDS).sort({ createdAt: -1 });
  res.json(await Promise.all(posts.map((post) => withCommentCount(post, req.user.id))));
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

  res.json({ ...serializePost(post, req.user.id), comments });
}

export async function createPost(req, res) {
  const { content, tags } = req.body;
  const post = await Post.create({ user: req.user.id, content, tags: Array.isArray(tags) ? tags : [] });
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

  const { content, tags } = req.body;
  if (content !== undefined) post.content = content;
  if (tags !== undefined) post.tags = Array.isArray(tags) ? tags : [];
  await post.save();
  await post.populate("user", USER_PUBLIC_FIELDS);

  res.json(await withCommentCount(post, req.user.id));
}

export async function deletePost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ message: "Not found" });
  }
  if (post.user.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  await Post.findByIdAndDelete(post._id);
  await Comment.deleteMany({ post: post._id });

  res.status(204).send();
}

export async function addComment(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ message: "Not found" });
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
  if (!isCommentOwner && !isPostOwner) {
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
  res.json(serializePost(updated, req.user.id));
}
