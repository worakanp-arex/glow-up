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
