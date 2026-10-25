import CounsellingSession from "../models/CounsellingSession.js";
import User from "../models/User.js";
import RehabilitationRecord from "../models/RehabilitationRecord.js";
import RiskAssessment from "../models/RiskAssessment.js";
import EmotionLog from "../models/EmotionLog.js";
import { computeStreakStats } from "../services/streakService.js";
import { notifyUser } from "../services/notificationService.js";
import { detectMeetingPlatform } from "../utils/meetingLink.js";
import { paginationOptions } from "../utils/pagination.js";
import { counsellorCanAccessPatient } from "../utils/patientAccess.js";

const USER_SUMMARY_FIELDS = "name email phone avatarUrl avatarStyle avatarColor verifiedStatus";
const COUNSELLOR_SUMMARY_FIELDS = "name specialization hospital avatarUrl avatarStyle avatarColor";

// A user may only have one request in progress at a time; a new one can be
// made after the current case is closed or cancelled.
const OPEN_STATUSES = ["pending", "active", "scheduled"];
const FINISHED_STATUSES = ["closed", "cancelled"];

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

  const open = await CounsellingSession.findOne({ user: req.user.id, status: { $in: OPEN_STATUSES } }).select("_id");
  if (open) {
    return res.status(409).json({
      message: "คุณมีคำขอปรึกษาที่ยังดำเนินการอยู่ กรุณารอปิดเคสหรือยกเลิกก่อนขอนัดหมายใหม่",
      sessionId: open._id,
    });
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
  const filter = { user: req.user.id };
  const pagination = paginationOptions(req.query);
  const query = CounsellingSession.find(filter)
    .populate("counsellor", COUNSELLOR_SUMMARY_FIELDS)
    .sort({ createdAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await CounsellingSession.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  res.json(await query);
}

export async function listQueue(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.user) filter.user = req.query.user;

  const pagination = paginationOptions(req.query);
  const query = CounsellingSession.find(filter)
    .populate("user", USER_SUMMARY_FIELDS)
    .populate("counsellor", COUNSELLOR_SUMMARY_FIELDS)
    .sort({ createdAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await CounsellingSession.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  res.json(await query);
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
    .populate("messages.sender", "name avatarUrl avatarStyle avatarColor role");
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
    { _id: req.params.id, counsellor: null, status: "pending" },
    { counsellor: req.user.id, status: "active" },
    { new: true }
  )
    .populate("user", USER_SUMMARY_FIELDS)
    .populate("counsellor", COUNSELLOR_SUMMARY_FIELDS);

  if (!session) {
    const exists = await CounsellingSession.exists({ _id: req.params.id });
    return res.status(exists ? 409 : 404).json({
      message: exists ? "เคสนี้มีบุคลากรรับไปแล้วหรือถูกยกเลิกแล้ว" : "Not found",
    });
  }

  // First counsellor to claim any of this user's sessions becomes their
  // assigned counsellor, gating access to the full clinical profile.
  await User.updateOne({ _id: session.user._id, assignedCounsellor: null }, { assignedCounsellor: req.user.id });

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
  if (FINISHED_STATUSES.includes(session.status)) {
    return res.status(409).json({ message: "เคสนี้ปิดแล้ว ไม่สามารถส่งข้อความเพิ่มได้" });
  }

  const senderRole = req.user.role === "user" ? "user" : "counsellor";
  session.messages.push({ sender: req.user.id, senderRole, content: content.trim() });
  await session.save();
  await session.populate("user", USER_SUMMARY_FIELDS);
  await session.populate("counsellor", COUNSELLOR_SUMMARY_FIELDS);
  await session.populate("messages.sender", "name avatarUrl avatarStyle avatarColor role");

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
  if (FINISHED_STATUSES.includes(session.status)) {
    return res.status(409).json({ message: "เคสนี้ปิดแล้ว ไม่สามารถเปลี่ยนนัดหมายได้" });
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

export async function recordOutcome(req, res) {
  const session = await CounsellingSession.findById(req.params.id);
  if (!session) {
    return res.status(404).json({ message: "Not found" });
  }
  if (req.user.role === "counsellor" && session.counsellor?.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  session.outcome = {
    summary: req.body.summary,
    recordedAt: new Date(),
    recordedBy: req.user.id,
  };
  await session.save();
  await session.populate("user", USER_SUMMARY_FIELDS);
  await session.populate("counsellor", COUNSELLOR_SUMMARY_FIELDS);
  await session.populate("outcome.recordedBy", "name");

  res.json(session);
}

// The person who made a request can withdraw it while it is still open.
export async function cancelMySession(req, res) {
  const session = await CounsellingSession.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id, status: { $in: OPEN_STATUSES } },
    { status: "cancelled" },
    { new: true }
  )
    .populate("user", USER_SUMMARY_FIELDS)
    .populate("counsellor", COUNSELLOR_SUMMARY_FIELDS);
  if (!session) {
    const exists = await CounsellingSession.exists({ _id: req.params.id, user: req.user.id });
    return res.status(exists ? 409 : 404).json({ message: exists ? "คำขอนี้ปิดหรือยกเลิกไปแล้ว" : "Not found" });
  }

  if (session.counsellor) {
    await notifyUser(session.counsellor._id, `${session.user.name} ยกเลิกคำขอปรึกษาเรื่อง "${session.topic}"`, "counselling", {
      link: `/counsellor/requests/${session._id}`,
    });
  }
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
    "name nickname email phone age gender address province bio role verifiedStatus avatarUrl avatarStyle avatarColor createdAt"
  );
  if (!targetUser || targetUser.role !== "user") {
    return res.status(404).json({ message: "ไม่พบผู้ใช้งานนี้" });
  }

  if (req.user.role === "counsellor" && !(await counsellorCanAccessPatient(req.user.id, targetUser._id))) {
    return res.status(403).json({ message: "คุณไม่ได้รับมอบหมายให้ดูแลผู้ใช้งานนี้" });
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
