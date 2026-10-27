import User from "../models/User.js";
import CounsellingSession from "../models/CounsellingSession.js";

// Gates counsellor access to a patient's clinical detail (rehab records, risk
// assessments, emotion logs, real-world risk situations, weekly check-ins) —
// admins bypass this entirely at the call site. A counsellor may view a
// patient once they're the assigned counsellor, or once they've had any
// counselling session with that patient (covers claims made before
// assignedCounsellor existed, without needing a backfill migration).
export async function counsellorCanAccessPatient(counsellorId, targetUserId) {
  const [target, hasSession] = await Promise.all([
    User.findById(targetUserId).select("assignedCounsellor"),
    CounsellingSession.exists({ user: targetUserId, counsellor: counsellorId }),
  ]);
  if (target?.assignedCounsellor && String(target.assignedCounsellor) === String(counsellorId)) return true;
  return Boolean(hasSession);
}

// Shared review queues (e.g. activity approvals) are notified to every
// counsellor, so a patient nobody looks after yet must stay reviewable or their
// submissions would be stuck. Among `userIds`, returns the ones this counsellor
// may review: patients they can access plus patients with no assigned counsellor.
// A patient who belongs to another counsellor is left out.
export async function reviewablePatientIds(counsellorId, userIds) {
  if (userIds.length === 0) return new Set();
  const [assignedToMe, unassigned, hadSessionWithMe] = await Promise.all([
    User.find({ _id: { $in: userIds }, assignedCounsellor: counsellorId }).select("_id"),
    User.find({ _id: { $in: userIds }, assignedCounsellor: null }).select("_id"),
    CounsellingSession.distinct("user", { counsellor: counsellorId, user: { $in: userIds } }),
  ]);
  return new Set([...assignedToMe.map((u) => String(u._id)), ...unassigned.map((u) => String(u._id)), ...hadSessionWithMe.map(String)]);
}
