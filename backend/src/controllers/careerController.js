import JobCategory from "../models/JobCategory.js";
import Job from "../models/Job.js";
import JobSkill from "../models/JobSkill.js";
import UserSkill from "../models/UserSkill.js";
import { scoreSkills } from "../services/jobMatchService.js";

// แนะนำอาชีพแบบอิงกฎ: สำหรับแต่ละหมวดงาน รวมทักษะที่ไม่ซ้ำซึ่งต้องใช้
// ในทุกประกาศของหมวดนั้น แล้วให้คะแนนทักษะของผู้ใช้เทียบกับกลุ่มทักษะนี้
// ด้วยสูตรเปอร์เซ็นต์ความตรงเดียวกับที่ใช้กับใบสมัครงาน
// (ทักษะที่ตรง / ทักษะที่ต้องการ * 100) หมวดที่ไม่มีข้อมูลทักษะจะถูกข้าม
// แทนที่จะแสดงคะแนน 0%/null ที่ทำให้เข้าใจผิด
export async function getRecommendedCareers(req, res) {
  const [categories, jobs, owned] = await Promise.all([
    JobCategory.find(),
    // นับเฉพาะงานที่ผู้หางานเห็นได้จริง ไม่เอางานที่รอตรวจ ถูกปฏิเสธ ปิดรับ หรือหมดเขตมาคิดทักษะ
    Job.find({
      category: { $ne: null },
      status: "open",
      verifiedStatus: "verified",
      $or: [{ expiredAt: null }, { expiredAt: { $gt: new Date() } }],
    }).select("category"),
    UserSkill.find({ user: req.user.id }).select("skill"),
  ]);

  const jobIdsByCategory = new Map();
  for (const job of jobs) {
    const key = String(job.category);
    if (!jobIdsByCategory.has(key)) jobIdsByCategory.set(key, []);
    jobIdsByCategory.get(key).push(job._id);
  }

  const jobSkills = await JobSkill.find({ job: { $in: jobs.map((j) => j._id) } }).populate("skill");
  const skillsByJob = new Map();
  for (const jobSkill of jobSkills) {
    const key = String(jobSkill.job);
    if (!skillsByJob.has(key)) skillsByJob.set(key, []);
    if (jobSkill.skill) skillsByJob.get(key).push(jobSkill.skill);
  }

  const ownedSkills = owned.map((s) => s.skill);

  const results = [];
  for (const category of categories) {
    const jobIds = jobIdsByCategory.get(String(category._id)) || [];
    if (jobIds.length === 0) continue;

    const requiredSkillsById = new Map();
    for (const jobId of jobIds) {
      for (const skill of skillsByJob.get(String(jobId)) || []) {
        requiredSkillsById.set(String(skill._id), skill);
      }
    }
    const match = scoreSkills([...requiredSkillsById.values()], ownedSkills);
    if (!match) continue;

    results.push({ category: { _id: category._id, name: category.name }, jobCount: jobIds.length, match });
  }

  results.sort((a, b) => b.match.score - a.match.score);
  res.json(results);
}
