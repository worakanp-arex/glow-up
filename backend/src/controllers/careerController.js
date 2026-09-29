import JobCategory from "../models/JobCategory.js";
import Job from "../models/Job.js";
import JobSkill from "../models/JobSkill.js";
import UserSkill from "../models/UserSkill.js";
import { scoreSkills } from "../services/jobMatchService.js";

// Rule-based career recommendation: for each job category, pool the distinct
// skills required across its postings and score the user's own skills
// against that pool with the same match% formula used for job applications
// (matched / required * 100). Categories with no skill data are skipped
// rather than shown with a misleading 0%/null score.
export async function getRecommendedCareers(req, res) {
  const [categories, jobs, owned] = await Promise.all([
    JobCategory.find(),
    Job.find({ category: { $ne: null } }).select("category"),
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
    skillsByJob.get(key).push(jobSkill.skill);
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
