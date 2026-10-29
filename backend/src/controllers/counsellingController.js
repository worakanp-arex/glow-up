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

// ผู้ใช้มีคำขอที่กำลังดำเนินการได้ครั้งละหนึ่งรายการเท่านั้น
// ขอใหม่ได้หลังจากเคสปัจจุบันปิดหรือยกเลิกแล้ว
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
  // `session.user` เป็น null เมื่อบัญชีของผู้ป่วยถูกลบแล้ว
  if (user.role === "user") return session.user?._id.toString() === user.id;
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

// เคสที่ผู้ให้คำปรึกษาท่านอื่นดูแลอยู่จะเหลือเพียงรายการในปฏิทิน
// มุมมองทีมจึงยังเห็นว่าใครไม่ว่าง โดยไม่เปิดเผยผู้ป่วย ข้อความ
// ห้องแชท หรือผลทางคลินิก (getSession ปฏิเสธเช่นเดียวกัน)
const CALENDAR_ENTRY_FIELDS = ["_id", "sessionType", "status", "scheduledAt", "counsellor", "createdAt"];

function claimedByAnotherCounsellor(session, counsellorId) {
  const owner = session.populated("counsellor") ?? session.counsellor?._id;
  return Boolean(owner) && String(owner) !== String(counsellorId);
}

function toCalendarEntry(session) {
  const entry = { restricted: true };
  for (const field of CALENDAR_ENTRY_FIELDS) entry[field] = session[field];
  return entry;
}

export async function listQueue(req, res) {
  const isCounsellor = req.user.role === "counsellor";
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.user) filter.user = req.query.user;
  // การค้นหาตามผู้ป่วยต้องไม่เปิดเผยว่าผู้ป่วยรายนั้นมีเคสกับผู้ให้คำปรึกษาท่านอื่นหรือไม่
  if (isCounsellor && req.query.user) filter.$or = [{ counsellor: null }, { counsellor: req.user.id }];

  const pagination = paginationOptions(req.query);
  const query = CounsellingSession.find(filter)
    .populate("user", USER_SUMMARY_FIELDS)
    .populate("counsellor", COUNSELLOR_SUMMARY_FIELDS)
    .sort({ createdAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await CounsellingSession.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  // เคสของผู้ป่วยที่บัญชีถูกลบแล้วจะหลุดออกจากคิว
  const sessions = (await query).filter((session) => session.user);
  if (!isCounsellor) return res.json(sessions);
  res.json(sessions.map((session) => (claimedByAnotherCounsellor(session, req.user.id) ? toCalendarEntry(session) : session)));
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
  if (!session || !session.user) {
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

  // บัญชีของผู้ป่วยถูกลบหลังจากขอรับบริการ: จึงไม่มีใครต้องดูแล
  if (!session.user) {
    await CounsellingSession.updateOne({ _id: session._id }, { counsellor: null, status: "cancelled" });
    return res.status(409).json({ message: "เคสนี้ถูกยกเลิกแล้ว" });
  }

  // ผู้ให้คำปรึกษาคนแรกที่รับเคสใดๆ ของผู้ใช้รายนี้จะกลายเป็นผู้ให้คำปรึกษาที่รับผิดชอบ
  // และเป็นตัวกำหนดสิทธิ์เข้าถึงโปรไฟล์ทางคลินิกฉบับเต็ม
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

  if (session.user) {
    await notifyUser(session.user._id, STATUS_MESSAGE.scheduled(session.topic), "counselling", {
      link: `/counselling/${session._id}`,
    });
  }
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

// ผู้ที่ส่งคำขอสามารถถอนคำขอได้ตราบที่ยังไม่ปิดเคส
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
  // เคสที่ปิดแล้ว หรือที่ผู้ขอถอนไปแล้ว จะคงสถานะนั้น: ถ้าเจ้าหน้าที่เปิดใหม่
  // จะเป็นการดึงคนที่ยุติการปรึกษาไปแล้วกลับเข้ามาอีกครั้ง
  if (FINISHED_STATUSES.includes(session.status)) {
    return res.status(409).json({ message: "เคสนี้ปิดหรือยกเลิกไปแล้ว ไม่สามารถเปลี่ยนสถานะได้" });
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

// มุมมองรวมสำหรับผู้ให้คำปรึกษา/แอดมินเท่านั้น เพื่อการทบทวนทางคลินิก
// เลียนแบบ read model ประวัติอารมณ์ของแอดมิน แต่รวมข้อมูลการบำบัดและความเสี่ยงมาไว้ด้วย
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
