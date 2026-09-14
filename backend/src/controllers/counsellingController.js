import CounsellingSession from "../models/CounsellingSession.js";
import User from "../models/User.js";
import RehabilitationRecord from "../models/RehabilitationRecord.js";
import RiskAssessment from "../models/RiskAssessment.js";
import EmotionLog from "../models/EmotionLog.js";
import { computeStreakStats } from "../services/streakService.js";
import { notifyUser } from "../services/notificationService.js";
import { detectMeetingPlatform } from "../utils/meetingLink.js";

const USER_SUMMARY_FIELDS = "name email phone avatarUrl verifiedStatus";
const COUNSELLOR_SUMMARY_FIELDS = "name specialization hospital avatarUrl";

const STATUS_MESSAGE = {
  active: (topic) => `บุคลากรทางการแพทย์รับคำขอปรึกษาเรื่อง "${topic}" ของคุณแล้ว`,
  scheduled: (topic) => `นัดหมายปรึกษาเรื่อง "${topic}" ได้รับการยืนยันแล้ว`,
  closed: (topic) => `คำขอปรึกษาเรื่อง "${topic}" ถูกปิดแล้ว`,
  cancelled: (topic) => `คำขอปรึกษาเรื่อง "${topic}" ถูกยกเลิก`,
};


function canAccessSession(session, user) {
  if (user.role === "admin") return true;
  if (user.role === "user") return session.user._id.toString() === user.id;
  if (user.role === "counsellor") {
    return !session.counsellor || session.counsellor._id.toString() === user.id;
  }
  return false;
}

export async function createSession(req, res) {
  const { sessionType, topic, message, mood, preferredAt } = req.body;
  if (!sessionType || !topic || !message || !mood || !preferredAt) {
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  const session = await CounsellingSession.create({
    user: req.user.id,
    sessionType,
    topic,
    message,
    mood,
    preferredAt,
  });
  res.status(201).json(session);
}

export async function mySessions(req, res) {
  const sessions = await CounsellingSession.find({ user: req.user.id })
    .populate("counsellor", COUNSELLOR_SUMMARY_FIELDS)
    .sort({ createdAt: -1 });
  res.json(sessions);
}

export async function listQueue(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.user) filter.user = req.query.user;

  const sessions = await CounsellingSession.find(filter)
    .populate("user", USER_SUMMARY_FIELDS)
    .populate("counsellor", COUNSELLOR_SUMMARY_FIELDS)
    .sort({ createdAt: -1 });
  res.json(sessions);
}

export async function mySchedule(req, res) {
  const sessions = await CounsellingSession.find({
    counsellor: req.user.id,
    scheduledAt: { $ne: null },
    status: { $in: ["scheduled", "active"] },
  })
    .populate("user", "name")
    .select("topic scheduledAt status user sessionType")
    .sort({ scheduledAt: 1 });
  res.json(sessions);
}

export async function getSession(req, res) {
  const session = await CounsellingSession.findById(req.params.id)
    .populate("user", USER_SUMMARY_FIELDS)
    .populate("counsellor", COUNSELLOR_SUMMARY_FIELDS)
    .populate("messages.sender", "name avatarUrl role");
  if (!session) {
    return res.status(404).json({ message: "Not found" });
  }
  if (!canAccessSession(session, req.user)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  res.json(session);
}

export async function claimSession(req, res) {
  const session = await CounsellingSession.findOneAndUpdate(
    { _id: req.params.id, counsellor: null },
    { counsellor: req.user.id, status: "active" },
    { new: true }
  )
    .populate("user", USER_SUMMARY_FIELDS)
    .populate("counsellor", COUNSELLOR_SUMMARY_FIELDS);

  if (!session) {
    const exists = await CounsellingSession.exists({ _id: req.params.id });
    return res.status(exists ? 409 : 404).json({
      message: exists ? "เคสนี้มีบุคลากรรับไปแล้ว" : "Not found",
    });
  }

  await notifyUser(session.user._id, STATUS_MESSAGE.active(session.topic), "counselling", {
    link: `/counselling/${session._id}`,
  });
  res.json(session);
}

export async function addMessage(req, res) {
  const { content } = req.body;
  if (!content?.trim()) {
    return res.status(400).json({ message: "กรุณากรอกข้อความ" });
  }

  const session = await CounsellingSession.findById(req.params.id);
  if (!session) {
    return res.status(404).json({ message: "Not found" });
  }

  const isOwner = req.user.role === "user" && session.user.toString() === req.user.id;
  const isAssignedCounsellor =
    req.user.role === "counsellor" && session.counsellor?.toString() === req.user.id;
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAssignedCounsellor && !isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const senderRole = req.user.role === "user" ? "user" : "counsellor";
  session.messages.push({ sender: req.user.id, senderRole, content: content.trim() });
  await session.save();
  await session.populate("user", USER_SUMMARY_FIELDS);
  await session.populate("counsellor", COUNSELLOR_SUMMARY_FIELDS);
  await session.populate("messages.sender", "name avatarUrl role");

  const notifyTarget = senderRole === "user" ? session.counsellor : session.user;
  if (notifyTarget) {
    await notifyUser(
      notifyTarget,
      `มีข้อความใหม่ในคำขอปรึกษาเรื่อง "${session.topic}"`,
      "counselling",
      { link: senderRole === "user" ? `/counsellor/requests/${session._id}` : `/counselling/${session._id}` }
    );
  }

  res.status(201).json(session);
}

export async function updateSchedule(req, res) {
  const { scheduledAt, meetingLink } = req.body;
  const session = await CounsellingSession.findById(req.params.id);
  if (!session) {
    return res.status(404).json({ message: "Not found" });
  }
  if (req.user.role === "counsellor" && session.counsellor?.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (scheduledAt !== undefined) session.scheduledAt = scheduledAt;
  if (meetingLink !== undefined) {
    session.meetingLink = meetingLink;
    session.meetingPlatform = detectMeetingPlatform(meetingLink);
  }
  if (session.scheduledAt) session.status = "scheduled";
  await session.save();
  await session.populate("user", USER_SUMMARY_FIELDS);
  await session.populate("counsellor", COUNSELLOR_SUMMARY_FIELDS);

  await notifyUser(session.user._id, STATUS_MESSAGE.scheduled(session.topic), "counselling", {
    link: `/counselling/${session._id}`,
  });
  res.json(session);
}

export async function updateStatus(req, res) {
  const { status } = req.body;
  if (!["active", "closed", "cancelled"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const session = await CounsellingSession.findById(req.params.id);
  if (!session) {
    return res.status(404).json({ message: "Not found" });
  }
  if (req.user.role === "counsellor" && session.counsellor?.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  session.status = status;
  await session.save();

  const messageFn = STATUS_MESSAGE[status];
  if (messageFn) {
    await notifyUser(session.user, messageFn(session.topic), "counselling", { link: `/counselling/${session._id}` });
  }

  await session.populate("user", USER_SUMMARY_FIELDS);
  await session.populate("counsellor", COUNSELLOR_SUMMARY_FIELDS);
  res.json(session);
}

// Counsellor/admin-only consolidated view for clinical review, mirroring the
// admin emotion-history read model but bundling rehab + risk data alongside it.
export async function getPatientProfile(req, res) {
  const targetUser = await User.findById(req.params.userId).select(
    "name email phone age gender address role verifiedStatus avatarUrl createdAt"
  );
  if (!targetUser || targetUser.role !== "user") {
    return res.status(404).json({ message: "ไม่พบผู้ใช้งานนี้" });
  }

  const [rehabRecords, riskAssessments, logs] = await Promise.all([
    RehabilitationRecord.find({ user: targetUser._id }).sort({ startDate: -1 }),
    RiskAssessment.find({ user: targetUser._id }).sort({ createdAt: -1 }),
    EmotionLog.find({ user: targetUser._id }).sort({ date: -1 }),
  ]);

  const emotionStreak = computeStreakStats(logs);

  res.json({
    user: targetUser,
    rehabRecords,
    riskAssessments,
    emotionStreak,
    emotionLogs: logs,
  });
}
