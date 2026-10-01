// How many of a job's required skills the signed-in user already has.
// Returns null when the job lists no skills (nothing to compare against).
export function skillMatch(job, mySkillIds) {
  const required = job?.skills || [];
  if (required.length === 0) return null;
  const matched = required.filter((skill) => mySkillIds.has(skill._id));
  const missing = required.filter((skill) => !mySkillIds.has(skill._id));
  return { matched, missing, total: required.length, score: Math.round((matched.length / required.length) * 100) };
}
