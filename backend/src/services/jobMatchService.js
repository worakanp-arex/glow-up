import JobSkill from "../models/JobSkill.js";
import UserSkill from "../models/UserSkill.js";
import { notifyUser } from "./notificationService.js";

// Only page job-seekers whose skills clear this bar — avoids notifying every
// user who happens to own one of ten required skills for a 1% "match".
const NEW_JOB_MATCH_NOTIFY_THRESHOLD = 50;

export function scoreSkills(required, owned) {
  const ownedIds = new Set(owned.map((skill) => String(skill._id || skill)));
  const unique = [...new Map(required.filter(Boolean).map((skill) => [String(skill._id), skill])).values()];
  if (!unique.length) return null;
  const matched = unique.filter((skill) => ownedIds.has(String(skill._id)));
  return { method: "skills", score: Math.round(matched.length / unique.length * 100),
    matchedSkills: matched.map((skill) => skill.skillName),
    missingSkills: unique.filter((skill) => !ownedIds.has(String(skill._id))).map((skill) => skill.skillName),
    totalSkills: unique.length };
}
export async function applicationMatches(userId, applications) {
  const [owned, required] = await Promise.all([
    UserSkill.find({ user: userId }).select("skill"),
    JobSkill.find({ job: { $in: applications.filter((a) => a.job).map((a) => a.job._id) } }).populate("skill"),
  ]);
  return applications.map((application) => ({ ...application.toObject(),
    match: scoreSkills(required.filter((s) => String(s.job) === String(application.job?._id)).map((s) => s.skill), owned.map((s) => s.skill)) }));
}

// Employer-side counterpart to applicationMatches: one job, many applicants.
export async function jobApplicantMatches(jobId, applications) {
  const userIds = applications.map((application) => application.user?._id || application.user).filter(Boolean);
  const [required, owned] = await Promise.all([
    JobSkill.find({ job: jobId }).populate("skill"),
    UserSkill.find({ user: { $in: userIds } }).select("user skill"),
  ]);
  const requiredSkills = required.map((s) => s.skill);
  const ownedByUser = new Map();
  for (const userSkill of owned) {
    const key = String(userSkill.user);
    if (!ownedByUser.has(key)) ownedByUser.set(key, []);
    ownedByUser.get(key).push(userSkill.skill);
  }
  return applications.map((application) => {
    const userKey = String(application.user?._id || application.user);
    return { ...application.toObject(), match: scoreSkills(requiredSkills, ownedByUser.get(userKey) || []) };
  });
}

// Skill match for applications spread over several postings at once (the
// employer's "all applicants" list). Every applicant is scored against the
// posting they applied to, whatever the status of their application.
export async function mixedApplicationMatches(applications) {
  const keyOf = (value) => String(value?._id || value || "");
  const jobIds = [...new Set(applications.map((application) => keyOf(application.job)).filter(Boolean))];
  const userIds = [...new Set(applications.map((application) => keyOf(application.user)).filter(Boolean))];
  const [required, owned] = await Promise.all([
    jobIds.length ? JobSkill.find({ job: { $in: jobIds } }).populate("skill") : [],
    userIds.length ? UserSkill.find({ user: { $in: userIds } }).select("user skill") : [],
  ]);
  const requiredByJob = new Map();
  for (const jobSkill of required) {
    const key = String(jobSkill.job);
    if (!requiredByJob.has(key)) requiredByJob.set(key, []);
    requiredByJob.get(key).push(jobSkill.skill);
  }
  const ownedByUser = new Map();
  for (const userSkill of owned) {
    const key = String(userSkill.user);
    if (!ownedByUser.has(key)) ownedByUser.set(key, []);
    ownedByUser.get(key).push(userSkill.skill);
  }
  return applications.map((application) => ({
    ...application.toObject(),
    match: scoreSkills(requiredByJob.get(keyOf(application.job)) || [], ownedByUser.get(keyOf(application.user)) || []),
  }));
}

// Called once a job clears admin moderation (verifiedStatus -> "verified") —
// pages every job-seeker whose declared skills clear the match threshold for
// this specific job's required skills.
export async function notifyMatchingUsersForJob(job) {
  const jobSkills = await JobSkill.find({ job: job._id }).populate("skill");
  const requiredSkills = jobSkills.map((js) => js.skill);
  if (requiredSkills.length === 0) return;

  const matchingUserSkills = await UserSkill.find({ skill: { $in: requiredSkills.map((s) => s._id) } }).select(
    "user skill"
  );
  const ownedByUser = new Map();
  for (const userSkill of matchingUserSkills) {
    const key = String(userSkill.user);
    if (!ownedByUser.has(key)) ownedByUser.set(key, []);
    ownedByUser.get(key).push(userSkill.skill);
  }

  for (const [userId, owned] of ownedByUser) {
    const match = scoreSkills(requiredSkills, owned);
    if (match && match.score >= NEW_JOB_MATCH_NOTIFY_THRESHOLD) {
      await notifyUser(
        userId,
        `งานใหม่ตรงกับทักษะของคุณ ${match.score}%: ตำแหน่ง "${job.title}"`,
        "job",
        { link: `/jobs/${job._id}` }
      );
    }
  }
}
