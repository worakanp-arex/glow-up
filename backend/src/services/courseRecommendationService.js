import SavedJob from "../models/SavedJob.js";
import Job from "../models/Job.js";
import JobSkill from "../models/JobSkill.js";
import Course from "../models/Course.js";
import UserCourse from "../models/UserCourse.js";
import { SKILL_CATEGORIES } from "../constants/skills.js";
import { openWindowFilter } from "../utils/dateKey.js";

const MIN_TERM_LENGTH = 3;
const SAVED_JOB_LIMIT = 20;
const SKILL_WEIGHT = 2;
const JOB_CATEGORY_WEIGHT = 1.5;
const SKILL_CATEGORY_WEIGHT = 1;
export const RECOMMENDATION_LIMIT = 6;

const SKILL_CATEGORY_LABELS = Object.fromEntries(SKILL_CATEGORIES.map((category) => [category.key, category.label]));

// Thai has no spaces between words, so a skill like "งานครัวและประกอบอาหาร" is
// cut at "และ" and its leading "การ"/"งาน" dropped. What is left ("ครัว",
// "ประกอบอาหาร") is what a course title is likely to actually say.
export function termsFrom(text) {
  return String(text || "")
    .split(/และ|[\s/,()-]+/)
    .map((part) => part.trim().replace(/^(การ|งาน)/, ""))
    .filter((part) => part.length >= MIN_TERM_LENGTH);
}

function weightedTerms(texts, weight) {
  return texts.flatMap((text) => termsFrom(text)).map((text) => ({ text, weight }));
}

// `savedJobs` come newest first, each with `{ _id, title, terms: [{ text, weight }] }`.
// A course is matched with the saved job it shares the most (weighted) terms
// with; a tie goes to the job saved most recently. Courses sharing nothing are left out.
export function rankCourses(courses, savedJobs) {
  const ranked = [];
  for (const course of courses) {
    const haystack = [course.title, course.category, ...(course.tags || []), course.description].filter(Boolean).join(" ").toLowerCase();
    let best = null;
    for (const job of savedJobs) {
      const seen = new Set();
      const matched = [];
      let score = 0;
      for (const term of job.terms) {
        const key = term.text.toLowerCase();
        if (seen.has(key) || !haystack.includes(key)) continue;
        seen.add(key);
        matched.push(term.text);
        score += term.weight;
      }
      if (score > 0 && (!best || score > best.score)) best = { score, job, matched };
    }
    if (best) ranked.push({ course, score: best.score, reason: { jobId: best.job._id, jobTitle: best.job.title, matched: best.matched.slice(0, 3) } });
  }
  return ranked.sort((a, b) => b.score - a.score);
}

// Courses that are open now and relate to the jobs a job seeker bookmarked,
// leaving out the ones they already saved.
export async function recommendCoursesForUser(userId, limit = RECOMMENDATION_LIMIT) {
  const saved = await SavedJob.find({ user: userId }).sort({ createdAt: -1 }).limit(SAVED_JOB_LIMIT).select("job");
  if (saved.length === 0) return [];

  const now = new Date();
  const jobs = await Job.find({
    _id: { $in: saved.map((item) => item.job) },
    status: "open",
    verifiedStatus: "verified",
    $or: [{ expiredAt: null }, { expiredAt: { $gt: now } }],
  })
    .select("title category")
    .populate("category", "name");
  if (jobs.length === 0) return [];

  const [jobSkills, courses, enrolled] = await Promise.all([
    JobSkill.find({ job: { $in: jobs.map((job) => job._id) } }).populate("skill", "skillName category"),
    Course.find(openWindowFilter(now)),
    UserCourse.find({ user: userId }).select("course"),
  ]);
  const enrolledIds = new Set(enrolled.map((item) => String(item.course)));

  const jobById = new Map(jobs.map((job) => [String(job._id), job]));
  const savedJobs = saved
    .map((item) => jobById.get(String(item.job)))
    .filter(Boolean)
    .map((job) => {
      const skills = jobSkills.filter((item) => String(item.job) === String(job._id) && item.skill).map((item) => item.skill);
      return {
        _id: job._id,
        title: job.title,
        terms: [
          ...weightedTerms(skills.map((skill) => skill.skillName), SKILL_WEIGHT),
          ...weightedTerms([job.category?.name], JOB_CATEGORY_WEIGHT),
          ...weightedTerms(skills.map((skill) => SKILL_CATEGORY_LABELS[skill.category]), SKILL_CATEGORY_WEIGHT),
        ],
      };
    });

  return rankCourses(courses.filter((course) => !enrolledIds.has(String(course._id))), savedJobs)
    .slice(0, limit)
    .map(({ course, reason }) => ({ ...course.toObject(), reason }));
}
