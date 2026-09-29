import JobSkill from "../models/JobSkill.js";
import UserSkill from "../models/UserSkill.js";

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
