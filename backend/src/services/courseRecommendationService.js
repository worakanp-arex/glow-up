import SavedJob from "../models/SavedJob.js";
import Job from "../models/Job.js";
import JobSkill from "../models/JobSkill.js";
import Course from "../models/Course.js";
import UserCourse from "../models/UserCourse.js";
import UserSkill from "../models/UserSkill.js";
import { SKILL_CATEGORIES } from "../constants/skills.js";
import { openWindowFilter } from "../utils/dateKey.js";

const MIN_TERM_LENGTH = 3;
const SAVED_JOB_LIMIT = 20;
const SKILL_WEIGHT = 2;
const JOB_CATEGORY_WEIGHT = 1.5;
const SKILL_CATEGORY_WEIGHT = 1;
// ทักษะที่ผู้ใช้ประเมินตัวเองไว้สูงกว่าถือว่าสนใจมากกว่า จึงบวกน้ำหนักตามระดับ (1-5)
const SKILL_LEVEL_WEIGHT = 0.5;
const MAX_SKILL_INTERESTS = 8;
export const RECOMMENDATION_LIMIT = 6;
// จำนวนคอร์สสูงสุดที่แบนเนอร์หน้าคอร์สเลื่อนวน
export const FEATURED_LIMIT = 5;

const SKILL_CATEGORY_LABELS = Object.fromEntries(SKILL_CATEGORIES.map((category) => [category.key, category.label]));
// หมวด "ทักษะชีวิตและการทำงาน" ใช้ได้กับทุกอาชีพ คำอย่าง "ทำงาน" จึงไปปรากฏในคำอธิบายคอร์สเกือบทุกคอร์ส
// ถ้าใช้เป็นตัวจับคู่จะแนะนำมั่ว (ทักษะย่อยในหมวดนี้ยังจับคู่ด้วยชื่อทักษะตามปกติ)
const GENERIC_SKILL_CATEGORY = "soft-skill";
const categoryLabel = (key) => (key === GENERIC_SKILL_CATEGORY ? undefined : SKILL_CATEGORY_LABELS[key]);

// ภาษาไทยไม่เว้นวรรคระหว่างคำ ทักษะอย่าง "งานครัวและประกอบอาหาร" จึงถูกตัดที่คำว่า "และ"
// และตัด "การ"/"งาน" ที่ขึ้นต้นออก สิ่งที่เหลือ ("ครัว", "ประกอบอาหาร") คือคำที่ชื่อคอร์สน่าจะใช้จริง
export function termsFrom(text) {
  return String(text || "")
    .split(/และ|[\s/,()-]+/)
    .map((part) => part.trim().replace(/^(การ|งาน)/, ""))
    .filter((part) => part.length >= MIN_TERM_LENGTH);
}

function weightedTerms(texts, weight) {
  return texts.flatMap((text) => termsFrom(text)).map((text) => ({ text, weight }));
}

// `savedJobs` เรียงใหม่สุดก่อน แต่ละรายการเป็น `{ _id, title, terms: [{ text, weight }] }`
// คอร์สจะจับคู่กับงานที่บันทึกไว้ซึ่งมีคำร่วม (ถ่วงน้ำหนัก) มากที่สุด
// ถ้าเสมอ ให้งานที่บันทึกล่าสุด คอร์สที่ไม่มีคำร่วมเลยจะถูกตัดออก
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

// งานที่ผู้ใช้บุ๊กมาร์กไว้และยังเปิดรับสมัครอยู่ แปลงเป็นรายการความสนใจ (รูปเดียวกับที่ rankCourses รับ)
// คืน [] เมื่อไม่มีงานที่บันทึกไว้เลย
async function loadSavedJobInterests(userId, now) {
  const saved = await SavedJob.find({ user: userId }).sort({ createdAt: -1 }).limit(SAVED_JOB_LIMIT).select("job");
  if (saved.length === 0) return [];

  const jobs = await Job.find({
    _id: { $in: saved.map((item) => item.job) },
    status: "open",
    verifiedStatus: "verified",
    $or: [{ expiredAt: null }, { expiredAt: { $gt: now } }],
  })
    .select("title category")
    .populate("category", "name");
  if (jobs.length === 0) return [];

  const jobSkills = await JobSkill.find({ job: { $in: jobs.map((job) => job._id) } }).populate("skill", "skillName category");
  const jobById = new Map(jobs.map((job) => [String(job._id), job]));
  return saved
    .map((item) => jobById.get(String(item.job)))
    .filter(Boolean)
    .map((job) => {
      const skills = jobSkills.filter((item) => String(item.job) === String(job._id) && item.skill).map((item) => item.skill);
      return {
        _id: job._id,
        title: job.title,
        kind: "saved-job",
        terms: [
          ...weightedTerms(skills.map((skill) => skill.skillName), SKILL_WEIGHT),
          ...weightedTerms([job.category?.name], JOB_CATEGORY_WEIGHT),
          ...weightedTerms(skills.map((skill) => categoryLabel(skill.category)), SKILL_CATEGORY_WEIGHT),
        ],
      };
    });
}

// คอร์สที่เปิดอยู่ตอนนี้และเกี่ยวข้องกับงานที่ผู้หางานบุ๊กมาร์กไว้
// ไม่รวมคอร์สที่ผู้ใช้บันทึกไว้แล้ว
export async function recommendCoursesForUser(userId, limit = RECOMMENDATION_LIMIT) {
  const now = new Date();
  const savedJobs = await loadSavedJobInterests(userId, now);
  if (savedJobs.length === 0) return [];

  const [courses, enrolled] = await Promise.all([
    Course.find(openWindowFilter(now)),
    UserCourse.find({ user: userId }).select("course"),
  ]);
  const enrolledIds = new Set(enrolled.map((item) => String(item.course)));

  return rankCourses(courses.filter((course) => !enrolledIds.has(String(course._id))), savedJobs)
    .slice(0, limit)
    .map(({ course, reason }) => ({ ...course.toObject(), reason }));
}

// ทักษะของผู้ใช้แต่ละอย่างเป็นความสนใจหนึ่งรายการ (รูปเดียวกับงานที่บันทึก จึงใช้ rankCourses ตัวเดิมได้)
// จับคู่จากชื่อทักษะเท่านั้น และถ่วงน้ำหนักตามระดับที่ผู้ใช้ตั้งไว้ จึงบอกได้ตรงๆ ว่า "ตรงกับทักษะ ..."
export function skillInterests(userSkills) {
  return userSkills
    .filter((item) => item.skill?.skillName)
    .map((item) => ({
      _id: item.skill._id,
      title: item.skill.skillName,
      kind: "skill",
      terms: weightedTerms([item.skill.skillName], SKILL_WEIGHT + (item.level || 1) * SKILL_LEVEL_WEIGHT),
    }));
}

// ทักษะที่ไม่มีคอร์สชื่อตรงกัน (เช่น งานเชื่อมโลหะ) ยังเจอคอร์สในสายงานใกล้เคียงได้ โดยจับคู่จากหมวดของทักษะ
// น้ำหนักต่ำกว่าการจับคู่ด้วยชื่อทักษะเสมอ และแสดงเหตุผลเป็น "สายงาน" ไม่ใช่ "ทักษะ" เพื่อไม่ให้อ้างเกินจริง
export function categoryInterests(userSkills) {
  const keys = [...new Set(userSkills.filter((item) => item.skill?.skillName).map((item) => item.skill.category))];
  return keys
    .filter((key) => categoryLabel(key))
    .map((key) => ({
      _id: `category:${key}`,
      title: SKILL_CATEGORY_LABELS[key],
      kind: "skill-category",
      terms: weightedTerms([SKILL_CATEGORY_LABELS[key]], SKILL_CATEGORY_WEIGHT),
    }));
}

// เลือกคอร์สให้หลากหลาย: จัดกลุ่มตามความสนใจที่ทำให้คอร์สนั้นถูกเลือก (กลุ่มที่มีคะแนนสูงสุดมาก่อน)
// แล้วหยิบสลับกลุ่มทีละคอร์ส เพื่อไม่ให้แบนเนอร์เต็มไปด้วยคอร์สของทักษะเดียว
// `ranked` ต้องเรียงคะแนนมากไปน้อยแล้ว (ผลของ rankCourses)
export function pickVaried(ranked, limit) {
  const groups = new Map();
  for (const entry of ranked) {
    const key = String(entry.reason.jobId);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  const queues = [...groups.values()];
  const picked = [];
  while (picked.length < limit && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      if (picked.length >= limit) break;
      const next = queue.shift();
      if (next) picked.push(next);
    }
  }
  return picked;
}

// เติมให้ครบจำนวนด้วยคอร์สอื่นที่เปิดอยู่ โดยเลือกหมวดที่ยังไม่มีในแบนเนอร์ก่อน
// รายการที่เติมไม่มี reason (คือไม่ได้ถูกเลือกเพราะความสนใจใด)
export function fillWithOthers(picked, courses, limit) {
  const chosen = new Set(picked.map((entry) => String(entry.course._id)));
  const usedCategories = new Set(picked.map((entry) => entry.course.category).filter(Boolean));
  const rest = courses.filter((course) => !chosen.has(String(course._id)));
  const result = [...picked];
  while (result.length < limit && rest.length > 0) {
    // คอร์สที่ไม่มีหมวดไม่นับว่าเป็น "หมวดใหม่" ไม่งั้นจะแซงคอร์สจากหมวดอื่นจริงๆ ได้ทุกครั้ง
    const index = Math.max(0, rest.findIndex((course) => course.category && !usedCategories.has(course.category)));
    const [course] = rest.splice(index, 1);
    if (course.category) usedCategories.add(course.category);
    result.push({ course, reason: null });
  }
  return result;
}

// คอร์สสำหรับแบนเนอร์หน้าคอร์ส: เลือกตามทักษะของผู้ใช้และงานที่บันทึกไว้ สลับกันหลายทักษะ
// ถ้ายังไม่ครบจึงเติมด้วยคอร์สอื่นที่เปิดอยู่ ไม่รวมคอร์สที่ผู้ใช้บันทึกไว้แล้ว (ฝั่งหน้าเว็บใส่ "เรียนต่อ" ไว้ต้นแถวเอง)
// reason.source: "skill" (ชื่อทักษะตรงกับคอร์ส) | "skill-category" (เหมาะกับสายงานของทักษะ) | "saved-job" | "general"
// และ reason.label คือชื่อทักษะ ชื่อสายงาน หรือชื่องานที่เป็นเหตุผล
export async function featuredCoursesForUser(userId, limit = FEATURED_LIMIT) {
  const now = new Date();
  const [userSkills, savedJobs, courses, enrolled] = await Promise.all([
    UserSkill.find({ user: userId }).sort({ level: -1 }).limit(MAX_SKILL_INTERESTS).populate("skill", "skillName category"),
    loadSavedJobInterests(userId, now),
    Course.find(openWindowFilter(now)).sort({ createdAt: -1 }),
    UserCourse.find({ user: userId }).select("course"),
  ]);
  const enrolledIds = new Set(enrolled.map((item) => String(item.course)));
  const fresh = courses.filter((course) => !enrolledIds.has(String(course._id)));

  const interests = [...skillInterests(userSkills), ...categoryInterests(userSkills), ...savedJobs];
  const interestById = new Map(interests.map((interest) => [String(interest._id), interest]));
  const picked = pickVaried(rankCourses(fresh, interests), limit);

  return fillWithOthers(picked, fresh, limit).map(({ course, reason }) => {
    const interest = reason && interestById.get(String(reason.jobId));
    return {
      ...course.toObject(),
      reason: interest
        ? { source: interest.kind, label: interest.title, matched: reason.matched }
        : { source: "general", label: null, matched: [] },
    };
  });
}
