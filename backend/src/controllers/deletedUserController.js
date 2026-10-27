import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import EmotionLog from "../models/EmotionLog.js";
import CounsellingSession from "../models/CounsellingSession.js";
import RehabilitationRecord from "../models/RehabilitationRecord.js";
import RiskAssessment from "../models/RiskAssessment.js";
import RiskSituationLog from "../models/RiskSituationLog.js";
import WeeklyCheckIn from "../models/WeeklyCheckIn.js";
import FamilyLink from "../models/FamilyLink.js";
import Application from "../models/Application.js";
import { paginationOptions, escapeRegex } from "../utils/pagination.js";
import { anonymizeOn, recordAudit, restoreUser } from "../services/accountLifecycleService.js";

const LIST_FIELDS = "name email role avatarUrl avatarStyle avatarColor deletedAt deletedBy deletionReason anonymizedAt createdAt";
const DAY_MS = 24 * 60 * 60 * 1000;

// Every query here names `deletedAt`, which is how the User model knows the caller
// is asking for deleted accounts on purpose (see the hook in models/User.js).
const deletedOnly = { deletedAt: { $ne: null } };

function describeRetention(user) {
  const anonymizeAt = anonymizeOn(user.deletedAt);
  return {
    anonymizeOn: anonymizeAt,
    daysLeft: user.anonymizedAt ? 0 : Math.max(0, Math.ceil((anonymizeAt.getTime() - Date.now()) / DAY_MS)),
  };
}

// Admin-only: the accounts that were deleted, and when each will be anonymised.
export async function listDeletedUsers(req, res) {
  const filter = { ...deletedOnly };
  if (req.query.state === "retained") filter.anonymizedAt = null;
  if (req.query.state === "anonymized") filter.anonymizedAt = { $ne: null };
  if (req.query.q) {
    const pattern = new RegExp(escapeRegex(String(req.query.q).trim()), "i");
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const pagination = paginationOptions(req.query);
  const query = User.find(filter).select(LIST_FIELDS).sort({ deletedAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await User.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  const users = await query;

  // Who deleted each account: an admin (shown by name) or the person themselves.
  const adminIds = [...new Set(users.filter((u) => u.deletedBy && String(u.deletedBy) !== String(u._id)).map((u) => String(u.deletedBy)))];
  const admins = adminIds.length > 0 ? await User.find({ _id: { $in: adminIds } }).select("name") : [];
  const adminName = new Map(admins.map((admin) => [String(admin._id), admin.name]));

  res.json(users.map((user) => ({
    ...user.toObject(),
    deletedBySelf: String(user.deletedBy) === String(user._id),
    deletedByName: adminName.get(String(user.deletedBy)) || null,
    ...describeRetention(user),
  })));
}

// Admin-only, read-only: one deleted account with the records kept for it. Opening
// it is written to the audit log first, so the record of who looked can't be skipped.
export async function getDeletedUser(req, res) {
  const user = await User.findOne({ _id: req.params.id, ...deletedOnly });
  if (!user) {
    return res.status(404).json({ message: "ไม่พบบัญชีที่ถูกลบนี้" });
  }
  await recordAudit({ actor: req.user.id, action: "deleted-account.viewed", targetUser: user._id });

  const auditTrail = await AuditLog.find({ targetUser: user._id }).sort({ createdAt: -1 }).limit(50).populate("actor", "name");
  const base = {
    user: user.toObject(),
    deletedBySelf: String(user.deletedBy) === String(user._id),
    anonymized: Boolean(user.anonymizedAt),
    ...describeRetention(user),
    auditTrail,
  };
  // Once anonymised there is nothing left of the person to show, only that it happened.
  if (user.anonymizedAt) {
    return res.json({ ...base, history: null });
  }

  const id = user._id;
  const [rehabRecords, riskAssessments, riskSituations, weeklyCheckIns, emotionLogs, sessions, familyLinkCount, applicationCount] = await Promise.all([
    RehabilitationRecord.find({ user: id }).sort({ startDate: -1 }),
    RiskAssessment.find({ user: id }).sort({ createdAt: -1 }).limit(50),
    RiskSituationLog.find({ user: id }).sort({ occurredAt: -1 }).limit(100),
    WeeklyCheckIn.find({ user: id }).sort({ createdAt: -1 }).limit(26),
    EmotionLog.find({ user: id }).sort({ date: -1 }).limit(200),
    CounsellingSession.find({ user: id }).populate("counsellor", "name specialization").sort({ createdAt: -1 }).limit(100),
    FamilyLink.countDocuments({ $or: [{ recoveringUser: id }, { familyUser: id }] }),
    Application.countDocuments({ user: id }),
  ]);
  res.json({
    ...base,
    history: { rehabRecords, riskAssessments, riskSituations, weeklyCheckIns, emotionLogs, sessions, familyLinkCount, applicationCount },
  });
}

export async function restoreDeletedUser(req, res) {
  const existing = await User.findOne({ _id: req.params.id, ...deletedOnly }).select("anonymizedAt");
  if (!existing) {
    return res.status(404).json({ message: "ไม่พบบัญชีที่ถูกลบนี้" });
  }
  if (existing.anonymizedAt) {
    return res.status(409).json({ message: "บัญชีนี้ถูกทำให้ไม่ระบุตัวตนแล้ว จึงกู้คืนไม่ได้" });
  }
  const user = await restoreUser(existing._id, req.user.id);
  if (!user) {
    return res.status(409).json({ message: "กู้คืนบัญชีไม่สำเร็จ กรุณาลองใหม่" });
  }
  res.json(user);
}
