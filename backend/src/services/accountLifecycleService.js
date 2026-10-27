import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import CounsellingSession from "../models/CounsellingSession.js";
import FamilyLink from "../models/FamilyLink.js";
import FamilyMessage from "../models/FamilyMessage.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import EmotionLog from "../models/EmotionLog.js";
import RehabilitationRecord from "../models/RehabilitationRecord.js";
import RiskAssessment from "../models/RiskAssessment.js";
import RiskSituationLog from "../models/RiskSituationLog.js";
import WeeklyCheckIn from "../models/WeeklyCheckIn.js";
import Goal from "../models/Goal.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import SavedPost from "../models/SavedPost.js";
import SavedJob from "../models/SavedJob.js";
import SavedLesson from "../models/SavedLesson.js";
import UserCourse from "../models/UserCourse.js";
import { removeStoredFile } from "../middleware/upload.js";
import { notifyUser } from "./notificationService.js";
import { disconnectUser } from "./socket.js";

// How long a deleted account's data is kept (so an admin can look at it or put it
// back) before it is anonymised for good.
export const RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const REMOVED_TEXT = "[ลบแล้ว]";
const OPEN_SESSION_STATUSES = ["pending", "active", "scheduled"];

export function anonymizeOn(deletedAt) {
  return new Date(new Date(deletedAt).getTime() + RETENTION_DAYS * DAY_MS);
}

export function recordAudit({ actor = null, action, targetUser, meta }) {
  return AuditLog.create({ actor, action, targetUser, meta });
}

// ---------- deleting ----------

// Takes a deleted account out of everything that is still live. Nothing is
// erased here: the person's own records stay for the retention period.
async function endLiveRelationships(user) {
  const id = user._id;

  // Their own open requests are withdrawn.
  await CounsellingSession.updateMany({ user: id, status: { $in: OPEN_SESSION_STATUSES } }, { status: "cancelled" });

  // A counsellor's cases go back to the queue so someone else can take them, and
  // the patients are told why their case moved.
  const orphaned = await CounsellingSession.find({ counsellor: id, status: { $in: ["active", "scheduled"] } }).select("user topic");
  if (orphaned.length > 0) {
    await CounsellingSession.updateMany({ _id: { $in: orphaned.map((s) => s._id) } }, { counsellor: null, status: "pending" });
    await Promise.all(orphaned.map((session) =>
      notifyUser(session.user, `คำขอปรึกษาเรื่อง "${session.topic}" ถูกส่งกลับคิวรอรับเคส เนื่องจากผู้ดูแลเดิมไม่สามารถดูแลต่อได้`, "counselling", { link: `/counselling/${session._id}` })
    ));
  }
  await User.updateMany({ assignedCounsellor: id }, { $unset: { assignedCounsellor: "" } });

  // Family connections in either direction end.
  await FamilyLink.updateMany(
    { $or: [{ recoveringUser: id }, { familyUser: id }], status: { $in: ["pending", "requested", "active"] } },
    { status: "revoked" }
  );

  // Job applications that were still in play are withdrawn; an employer's open
  // postings are closed.
  await Application.updateMany({ user: id, status: { $in: ["pending", "interview"] } }, { status: "cancelled" });
  await Job.updateMany({ employer: id, status: "open" }, { status: "closed" });
}

// Returns the deleted user, or null if there is no such (live) account.
export async function softDeleteUser(userId, { actorId, reason }) {
  const user = await User.findOneAndUpdate(
    { _id: userId },
    { $set: { deletedAt: new Date(), deletedBy: actorId, deletionReason: reason } },
    { new: true }
  );
  if (!user) return null;
  await endLiveRelationships(user);
  disconnectUser(user._id);
  await recordAudit({ actor: actorId, action: "account.deleted", targetUser: user._id, meta: { reason, role: user.role } });
  return user;
}

// ---------- restoring ----------

// Brings a deleted account back, if it hasn't been anonymised yet. What was
// wound down when it was deleted (cancelled requests, revoked family links, closed
// postings) stays that way: those other people were already told or affected.
export async function restoreUser(userId, actorId) {
  const user = await User.findOneAndUpdate(
    { _id: userId, deletedAt: { $ne: null }, anonymizedAt: null },
    { $unset: { deletedAt: "", deletedBy: "", deletionReason: "" } },
    { new: true }
  );
  if (!user) return null;
  await recordAudit({ actor: actorId, action: "account.restored", targetUser: user._id });
  return user;
}

// ---------- anonymising ----------

async function wipeFreeTextOf(user) {
  const id = user._id;

  const links = await FamilyLink.find({ $or: [{ recoveringUser: id }, { familyUser: id }] }).select("_id");
  const linkIds = links.map((link) => link._id);
  const applications = await Application.find({ user: id }).select("attachments");
  const certificates = await UserCourse.find({ user: id, certificateUrl: { $ne: null } }).select("certificateUrl");

  // Numbers and dates that describe the service as a whole stay; everything a
  // person wrote about themselves goes.
  await EmotionLog.updateMany({ user: id }, { $unset: { note: "" } });
  await CounsellingSession.updateMany(
    { user: id },
    {
      $set: { topic: REMOVED_TEXT, message: REMOVED_TEXT, "messages.$[].content": REMOVED_TEXT },
      $unset: { meetingLink: "", "outcome.summary": "" },
    }
  );
  await RiskAssessment.updateMany({ user: id }, { $unset: { triggerFactors: "" } });
  await RiskSituationLog.updateMany({ user: id }, { $set: { situation: REMOVED_TEXT }, $unset: { skillDescription: "" } });
  await WeeklyCheckIn.updateMany({ user: id }, { $unset: { notes: "" } });
  await RehabilitationRecord.updateMany({ user: id }, { $set: { hospitalName: REMOVED_TEXT } });
  await Goal.updateMany({ user: id }, { $set: { title: REMOVED_TEXT }, $unset: { description: "" } });
  await Comment.updateMany({ user: id }, { $set: { content: REMOVED_TEXT } });
  await Application.updateMany({ user: id }, { $set: { attachments: [] }, $unset: { employerFeedback: "", rejectionReason: "" } });
  await UserCourse.updateMany({ user: id }, { $unset: { certificateUrl: "" } });
  if (linkIds.length > 0) {
    await FamilyMessage.updateMany({ familyLink: { $in: linkIds } }, { $set: { content: REMOVED_TEXT } });
    // The other person's address is theirs, not ours to keep: replaced per link so each stays unique.
    await FamilyLink.updateMany(
      { _id: { $in: linkIds } },
      [{ $set: { inviteEmail: { $concat: ["removed-", { $toString: "$_id" }, "@anonymized.invalid"] } } }, { $unset: "inviteTokenHash" }]
    );
  }
  await Notification.deleteMany({ user: id });
  await Promise.all([SavedPost, SavedJob, SavedLesson].map((Model) => Model.deleteMany({ user: id })));

  const fileUrls = [
    user.avatarUrl,
    user.resumeUrl,
    ...(user.certificates || []).map((certificate) => certificate.url),
    ...certificates.map((course) => course.certificateUrl),
    ...applications.flatMap((application) => (application.attachments || []).map((attachment) => attachment.url)),
  ].filter(Boolean);
  await Promise.all(fileUrls.map(removeStoredFile));
}

// Strips one deleted account of everything that identifies the person. Safe to
// run again: the account only gets its `anonymizedAt` mark at the very end, so an
// interrupted run is simply picked up next time.
export async function anonymizeUser(user) {
  await wipeFreeTextOf(user);
  await User.updateOne(
    { _id: user._id },
    {
      $set: { name: "ผู้ใช้ที่ถูกลบ", email: `deleted-${user._id}@anonymized.invalid`, certificates: [], anonymizedAt: new Date() },
      $unset: {
        nickname: "", phone: "", address: "", province: "", bio: "", education: "", experience: "", age: "", gender: "",
        companyName: "", businessType: "", taxId: "", website: "", companySize: "", companyDescription: "", contactPosition: "",
        position: "", department: "", specialization: "", hospital: "", familyName: "", verificationNote: "", deletionReason: "",
        avatarUrl: "", coverPreset: "", resumeUrl: "", googleId: "", password: "", resetPasswordTokenHash: "", resetPasswordExpires: "",
        assignedCounsellor: "",
      },
    },
    { withDeleted: true }
  );
  await recordAudit({ actor: null, action: "account.anonymized", targetUser: user._id });
}

// The scheduled job: anonymise every account whose retention period has run out.
// Returns how many were done.
export async function anonymizeExpiredUsers(now = new Date(), batchSize = 50) {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * DAY_MS);
  const due = await User.find({ deletedAt: { $ne: null, $lte: cutoff }, anonymizedAt: null }).limit(batchSize);
  let done = 0;
  for (const user of due) {
    try {
      await anonymizeUser(user);
      done += 1;
    } catch (error) {
      console.error(`Anonymising account ${user._id} failed:`, error.message);
    }
  }
  return done;
}
