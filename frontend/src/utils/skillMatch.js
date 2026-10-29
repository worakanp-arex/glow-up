// ผู้ใช้ที่ล็อกอินมีทักษะกี่ข้อจากทักษะที่งานต้องการ
// คืน null เมื่องานไม่ได้ระบุทักษะ (ไม่มีอะไรให้เทียบ)
export function skillMatch(job, mySkillIds) {
  const required = job?.skills || [];
  if (required.length === 0) return null;
  const matched = required.filter((skill) => mySkillIds.has(skill._id));
  const missing = required.filter((skill) => !mySkillIds.has(skill._id));
  return { matched, missing, total: required.length, score: Math.round((matched.length / required.length) * 100) };
}
