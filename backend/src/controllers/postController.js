import mongoose from "mongoose";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import SavedPost from "../models/SavedPost.js";
import { sanitizeText } from "../utils/sanitizeText.js";
import { paginationOptions } from "../utils/pagination.js";
import { notifyUser, notifyStaff } from "../services/notificationService.js";
import { REPORT_REASON_VALUES, reportReasonLabel } from "../constants/reportReasons.js";

const USER_PUBLIC_FIELDS = "name role avatarUrl avatarStyle avatarColor specialization";
const STAFF_ROLES = ["admin", "counsellor"];
const REPORTS_PER_DAY = 10;

// เจ้าหน้าที่ (แอดมิน/ผู้ให้คำปรึกษา) เห็นทุกโพสต์เพื่อการกลั่นกรอง คนอื่นเห็นเฉพาะ
// โพสต์ที่ไม่จำกัดกลุ่มผู้ชม (visibleToRoles: []) หรือที่ระบุบทบาทของตนไว้
// และจะไม่เห็นโพสต์ที่ถูกรายงานและรอเจ้าหน้าที่ตรวจสอบ
function visibilityFilter(role) {
  if (STAFF_ROLES.includes(role)) return {};
  return { needsReview: { $ne: true }, $or: [{ visibleToRoles: { $size: 0 } }, { visibleToRoles: role }] };
}

function reporterId(report) {
  return String(report.reporter?._id || report.reporter);
}

// `reports` บอกว่าใครรายงานอะไร จึงคืนผ่านรายการกลั่นกรองของเจ้าหน้าที่เท่านั้น
// คนอื่นจะรู้เพียงว่าตนเองรายงานไปแล้วหรือยัง
function serializePost(post, userId, savedIds) {
  const obj = post.toObject ? post.toObject() : post;
  const likedByMe = Boolean(userId) && (obj.likedBy || []).some((id) => id.toString() === userId);
  const savedByMe = Boolean(savedIds) && savedIds.has(obj._id.toString());
  const reportedByMe = Boolean(userId) && (obj.reports || []).some((report) => reporterId(report) === userId);
  const reportCount = (obj.reports || []).length;
  delete obj.likedBy;
  delete obj.reports;
  return { ...obj, likedByMe, savedByMe, reportedByMe, reportCount };
}

async function withCommentCount(post, userId, savedIds) {
  const commentCount = await Comment.countDocuments({ post: post._id });
  return { ...serializePost(post, userId, savedIds), commentCount };
}

// นับคอมเมนต์ของโพสต์ทั้งหน้าใน query เดียว ไม่ใช่ทีละโพสต์
async function withCommentCounts(posts, userId, savedIds) {
  if (posts.length === 0) return [];
  const rows = await Comment.aggregate([
    { $match: { post: { $in: posts.map((post) => post._id) } } },
    { $group: { _id: "$post", count: { $sum: 1 } } },
  ]);
  const counts = new Map(rows.map((row) => [String(row._id), row.count]));
  return posts.map((post) => ({ ...serializePost(post, userId, savedIds), commentCount: counts.get(String(post._id)) || 0 }));
}

async function getSavedIdSet(userId) {
  const saved = await SavedPost.find({ user: userId }).select("post");
  return new Set(saved.map((s) => s.post.toString()));
}

export async function listPosts(req, res) {
  const filter = visibilityFilter(req.user.role);
  const pagination = paginationOptions(req.query);
  const postQuery = Post.find(filter).populate("user", USER_PUBLIC_FIELDS).sort({ createdAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await Post.countDocuments(filter));
    postQuery.skip(pagination.skip).limit(pagination.limit);
  }
  const [posts, savedIds] = await Promise.all([postQuery, getSavedIdSet(req.user.id)]);
  // ไม่แสดงโพสต์ของผู้เขียนที่บัญชีถูกลบแล้ว
  res.json(await withCommentCounts(posts.filter((post) => post.user), req.user.id, savedIds));
}

export async function myPosts(req, res) {
  const filter = { user: req.user.id };
  const pagination = paginationOptions(req.query);
  const postQuery = Post.find(filter).populate("user", USER_PUBLIC_FIELDS).sort({ createdAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await Post.countDocuments(filter));
    postQuery.skip(pagination.skip).limit(pagination.limit);
  }
  const [posts, savedIds] = await Promise.all([postQuery, getSavedIdSet(req.user.id)]);
  res.json(await withCommentCounts(posts, req.user.id, savedIds));
}

// คงลำดับที่ผู้ใช้บันทึกไว้ (บันทึกล่าสุดก่อน)
// แทนที่จะย้อนไปใช้ลำดับ createdAt ของโพสต์เอง
export async function mySavedPosts(req, res) {
  const filter = { user: req.user.id };
  const pagination = paginationOptions(req.query);
  const savedQuery = SavedPost.find(filter).sort({ createdAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await SavedPost.countDocuments(filter));
    savedQuery.skip(pagination.skip).limit(pagination.limit);
  }
  const saved = await savedQuery;
  const postIds = saved.map((s) => s.post);
  const posts = await Post.find({ _id: { $in: postIds }, ...visibilityFilter(req.user.role) }).populate(
    "user",
    USER_PUBLIC_FIELDS
  );
  const postById = new Map(posts.map((p) => [p._id.toString(), p]));
  const savedIds = new Set(postIds.map((id) => id.toString()));
  const ordered = postIds.map((id) => postById.get(id.toString())).filter((post) => post?.user);
  res.json(await withCommentCounts(ordered, req.user.id, savedIds));
}

export async function getPost(req, res) {
  const post = await Post.findOne(
    { _id: req.params.id, ...visibilityFilter(req.user.role) }
  ).populate("user", USER_PUBLIC_FIELDS);
  if (!post || !post.user) {
    return res.status(404).json({ message: "Not found" });
  }

  // ไม่แสดงคอมเมนต์ของผู้ที่บัญชีถูกลบแล้ว
  const comments = (await Comment.find({ post: post._id })
    .populate("user", USER_PUBLIC_FIELDS)
    .sort({ createdAt: 1 })).filter((comment) => comment.user);
  const savedIds = await getSavedIdSet(req.user.id);

  res.json({ ...serializePost(post, req.user.id, savedIds), comments });
}

export async function createPost(req, res) {
  const { content, tags, commentsEnabled, visibleToRoles } = req.body;
  const post = await Post.create({
    user: req.user.id,
    content: sanitizeText(content),
    tags: Array.isArray(tags) ? tags : [],
    commentsEnabled: commentsEnabled !== undefined ? Boolean(commentsEnabled) : true,
    visibleToRoles: Array.isArray(visibleToRoles) ? visibleToRoles : [],
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

  const { content, tags, commentsEnabled, visibleToRoles } = req.body;
  if (content !== undefined) post.content = sanitizeText(content);
  if (tags !== undefined) post.tags = Array.isArray(tags) ? tags : [];
  if (commentsEnabled !== undefined) post.commentsEnabled = Boolean(commentsEnabled);
  if (visibleToRoles !== undefined) post.visibleToRoles = Array.isArray(visibleToRoles) ? visibleToRoles : [];
  // การแก้ไขโพสต์ที่ถูกรายงานถือว่าจัดการเรื่องแล้ว: โพสต์จะแสดงอีกครั้ง และ
  // ผู้ที่รายงานจะได้รับแจ้งว่ามีการเปลี่ยนแปลง
  const reporters = post.needsReview ? resolveReports(post, "edited", req.user.id) : [];
  await post.save();
  await notifyReporters(reporters, "โพสต์ที่คุณรายงานได้รับการแก้ไขแล้ว ขอบคุณที่ช่วยดูแลชุมชน", `/community/${post._id}`);
  await post.populate("user", USER_PUBLIC_FIELDS);

  res.json(await withCommentCount(post, req.user.id));
}

// เจ้าหน้าที่แก้ไขโพสต์ที่ถูกรายงาน (ผู้เขียนคนใดก็ได้) ผลเหมือนกับที่ผู้เขียน
// แก้เอง: ล้างรายงาน แสดงโพสต์อีกครั้ง และแจ้งทั้ง
// ผู้รายงานและผู้เขียน
export async function moderatePost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ message: "Not found" });
  }
  if (!post.needsReview && post.user.toString() !== req.user.id) {
    return res.status(409).json({ message: "โพสต์นี้ไม่ได้ถูกรายงาน" });
  }

  const { content, tags, commentsEnabled, visibleToRoles, note } = req.body;
  if (content !== undefined) post.content = sanitizeText(content);
  if (tags !== undefined) post.tags = Array.isArray(tags) ? tags : [];
  if (commentsEnabled !== undefined) post.commentsEnabled = Boolean(commentsEnabled);
  if (visibleToRoles !== undefined) post.visibleToRoles = Array.isArray(visibleToRoles) ? visibleToRoles : [];
  const reporters = resolveReports(post, "edited", req.user.id, note);
  await post.save();
  await notifyReporters(reporters, "โพสต์ที่คุณรายงานได้รับการแก้ไขแล้ว ขอบคุณที่ช่วยดูแลชุมชน", `/community/${post._id}`);
  if (post.user.toString() !== req.user.id) {
    await notifyUser(post.user, "โพสต์ของคุณถูกแก้ไขโดยทีมดูแลเนื่องจากมีการรายงาน", "moderation", { link: `/community/${post._id}` });
  }
  await post.populate("user", USER_PUBLIC_FIELDS);

  res.json(await withCommentCount(post, req.user.id));
}

export async function deletePost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ message: "Not found" });
  }
  const isAuthor = post.user.toString() === req.user.id;
  const mayModerate = STAFF_ROLES.includes(req.user.role) && post.needsReview;
  if (!isAuthor && req.user.role !== "admin" && !mayModerate) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const reporters = (post.reports || []).map(reporterId);
  await Post.findByIdAndDelete(post._id);
  await Comment.deleteMany({ post: post._id });
  await SavedPost.deleteMany({ post: post._id });
  await notifyReporters(reporters, "โพสต์ที่คุณรายงานถูกลบออกแล้ว ขอบคุณที่ช่วยดูแลชุมชน", "/community");
  if (!isAuthor && post.needsReview) {
    await notifyUser(post.user, "โพสต์ของคุณถูกลบเนื่องจากมีการรายงานและตรวจสอบแล้ว", "moderation", { link: "/community/mine" });
  }

  res.status(204).send();
}

export async function addComment(req, res) {
  // สิทธิ์เห็นเหมือนการอ่านโพสต์: โพสต์ที่คุณมองไม่เห็นจะตอบ 404
  const post = await Post.findOne({ _id: req.params.id, ...visibilityFilter(req.user.role) });
  if (!post) {
    return res.status(404).json({ message: "Not found" });
  }
  if (!post.commentsEnabled) {
    return res.status(403).json({ message: "โพสต์นี้ปิดการแสดงความคิดเห็น" });
  }

  const comment = await Comment.create({ post: post._id, user: req.user.id, content: sanitizeText(req.body.content) });
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

  comment.content = sanitizeText(req.body.content);
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
  // บันทึกสถานะที่ขอแบบ atomic แล้วค่อยคำนวณจำนวนจากรายชื่อสมาชิก
  // การคืนเฉพาะปฏิกิริยาช่วยไม่ให้ไปแทนที่ข้อมูลผู้เขียนที่ populate ไว้ในไคลเอนต์
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const members = { $ifNull: ["$likedBy", []] };
  const liked = typeof req.body.liked === "boolean" ? req.body.liked : { $not: [{ $in: [userId, members] }] };
  const updated = await Post.findOneAndUpdate({ _id: req.params.id, ...visibilityFilter(req.user.role) }, [
    { $set: { likedBy: { $cond: [liked, { $setUnion: [members, [userId]] }, { $setDifference: [members, [userId]] }] } } },
    { $set: { likes: { $size: "$likedBy" } } },
  ], { new: true });
  if (!updated) return res.status(404).json({ message: "Not found" });
  res.json({ likes: updated.likes, likedByMe: updated.likedBy.some(id => id.toString() === req.user.id) });
}

// ล้างรายงาน (โพสต์แสดงอีกครั้ง) และคืนรายชื่อผู้ที่รายงาน
// เพื่อให้แจ้งผลแก่พวกเขาได้
function resolveReports(post, action, reviewerId, note) {
  const reporters = [...new Set((post.reports || []).map(reporterId))];
  post.reports = [];
  post.needsReview = false;
  post.lastReview = { reviewer: reviewerId, action, at: new Date(), note: note ? sanitizeText(note).slice(0, 500) : undefined };
  return reporters;
}

function notifyReporters(reporterIds, message, link) {
  return Promise.all(reporterIds.map((id) => notifyUser(id, message, "moderation", { link })));
}

export async function flagPostForReview(req, res) {
  const post = await Post.findOne({ _id: req.params.id, ...visibilityFilter(req.user.role) });
  if (!post) {
    return res.status(404).json({ message: "Not found" });
  }
  if (post.user.toString() === req.user.id) {
    return res.status(400).json({ message: "ไม่สามารถรายงานโพสต์ของตัวเองได้" });
  }

  // การรายงานซ่อนโพสต์จากทุกคนจนกว่าเจ้าหน้าที่จะตรวจสอบ ดังนั้นบัญชีหนึ่ง
  // รายงานได้เพียงไม่กี่ครั้งต่อวัน: จะได้ไม่ถูกใช้ทำให้ชุมชนว่างเปล่า
  const reportsToday = await Post.countDocuments({
    reports: { $elemMatch: { reporter: req.user.id, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
  });
  if (reportsToday >= REPORTS_PER_DAY) {
    return res.status(429).json({ message: "รายงานโพสต์ครบจำนวนที่ทำได้ต่อวันแล้ว กรุณาลองใหม่พรุ่งนี้" });
  }

  const reason = REPORT_REASON_VALUES.includes(req.body?.reason) ? req.body.reason : "other";
  const detail = typeof req.body?.detail === "string" ? sanitizeText(req.body.detail).slice(0, 500) : "";
  // เงื่อนไข $ne ทำให้การรายงานซ้ำจากคนเดิมไม่มีผล แม้
  // สองคำขอจะแข่งกันเข้ามา
  const updated = await Post.findOneAndUpdate(
    { _id: post._id, "reports.reporter": { $ne: req.user.id } },
    { $push: { reports: { reporter: req.user.id, reason, detail } }, $set: { needsReview: true } },
    { new: true }
  );
  if (updated) {
    await notifyStaff(`มีการรายงานโพสต์ (${reportReasonLabel(reason)}) รอตรวจสอบ`, "report", { link: "/admin/posts-moderation" });
  }
  res.json({ needsReview: true, reportedByMe: true });
}

// "ตรวจแล้วไม่พบการละเมิด": โพสต์แสดงอีกครั้งโดยไม่เปลี่ยนแปลง
export async function clearPostFlag(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ message: "Not found" });
  }
  const reporters = resolveReports(post, "kept", req.user.id, req.body?.note);
  await post.save();
  await notifyReporters(reporters, "ทีมดูแลตรวจสอบโพสต์ที่คุณรายงานแล้ว ไม่พบเนื้อหาที่ละเมิด โพสต์จึงแสดงตามปกติ", `/community/${post._id}`);
  res.json({ needsReview: false });
}

export async function listFlaggedPosts(req, res) {
  const filter = { needsReview: true };
  const pagination = paginationOptions(req.query);
  const query = Post.find(filter)
    .populate("user", USER_PUBLIC_FIELDS)
    .populate("reports.reporter", "name role")
    .sort({ updatedAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await Post.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  const posts = await query;
  res.json(posts.map((post) => {
    // ชื่อผู้รายงานเปิดให้แอดมินเท่านั้น ผู้ให้คำปรึกษา (ซึ่งอาจเป็นผู้เขียนโพสต์) เห็นแต่เหตุผล
    const reports = (post.reports || []).map((report) => ({
      reason: report.reason,
      reasonLabel: reportReasonLabel(report.reason),
      detail: report.detail || "",
      createdAt: report.createdAt,
      reporter: req.user.role === "admin" && report.reporter ? { _id: report.reporter._id, name: report.reporter.name, role: report.reporter.role } : null,
    }));
    return { ...serializePost(post, req.user.id), reports };
  }));
}

export async function toggleSavePost(req, res) {
  const post = await Post.findOne({ _id: req.params.id, ...visibilityFilter(req.user.role) }).select("_id");
  // ลบบุ๊กมาร์กได้เสมอ แม้โพสต์นั้นจะไม่ปรากฏให้คุณเห็นแล้ว
  const existing = await SavedPost.findOne({ user: req.user.id, post: req.params.id });
  if (existing) {
    await SavedPost.deleteOne({ _id: existing._id });
    return res.json({ savedByMe: false });
  }
  if (!post) {
    return res.status(404).json({ message: "Not found" });
  }
  await SavedPost.create({ user: req.user.id, post: post._id });
  res.json({ savedByMe: true });
}
