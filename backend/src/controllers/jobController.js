import Job from "../models/Job.js";
import { paginationOptions, escapeRegex } from "../utils/pagination.js";
import JobSkill from "../models/JobSkill.js";
import Skill from "../models/Skill.js";
import UserSkill from "../models/UserSkill.js";
import Application from "../models/Application.js";
import SavedJob from "../models/SavedJob.js";
import { notifyUser } from "../services/notificationService.js";
import { notifyMatchingUsersForJob } from "../services/jobMatchService.js";
import { sanitizeText } from "../utils/sanitizeText.js";
import { UPLOAD_ROOT, publicUrl } from "../middleware/upload.js";
import fs from "fs";
import path from "path";

function removeUploadedImage(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith("/uploads/job-images/")) return;
  fs.unlink(path.join(UPLOAD_ROOT, fileUrl.replace("/uploads/", "")), () => {});
}

// เอกสารของผู้สมัครอยู่บนดิสก์ ดังนั้นการลบใบสมัครต้องลบเอกสารเหล่านั้นด้วย
function removeApplicationAttachments(applications) {
  for (const application of applications) {
    for (const attachment of application.attachments || []) {
      if (!attachment.url?.startsWith("/uploads/application-attachments/")) continue;
      fs.unlink(path.join(UPLOAD_ROOT, "application-attachments", path.basename(attachment.url)), () => {});
    }
  }
}

const EMPLOYER_EDITABLE_FIELDS = [
  "title",
  "description",
  "externalUrl",
  "location",
  "salary",
  "status",
  "expiredAt",
  "category",
  "attachmentRequests",
];

const EMPLOYER_PUBLIC_FIELDS = "name companyName avatarUrl avatarStyle avatarColor businessType";
// ข้อมูลที่แอดมินต้องใช้ตัดสินว่านายจ้าง (และประกาศงาน) ถูกต้องตามกฎหมายหรือไม่
const EMPLOYER_ADMIN_FIELDS = `${EMPLOYER_PUBLIC_FIELDS} email phone taxId address verifiedStatus`;
// ฟิลด์ที่ส่งมาเป็น "" จากช่องฟอร์มที่เว้นว่าง หมายถึง "ไม่ได้ตั้งค่า"
const BLANKABLE_FIELDS = ["externalUrl", "salary", "expiredAt", "category"];
// สิ่งที่ผู้ตรวจสอบอ่านจริงเมื่ออนุมัติประกาศงาน
const MODERATED_FIELDS = ["title", "description", "externalUrl", "location", "salary", "attachmentRequests"];

function moderatedContent(job) {
  return JSON.stringify(MODERATED_FIELDS.map((field) => job[field] ?? null));
}

async function attachSkills(job) {
  const jobSkills = await JobSkill.find({ job: job._id }).populate("skill");
  const obj = job.toObject();
  // ทักษะที่ถูกลบออกจากแคตตาล็อกจะ populate เป็น null จึงกรองทิ้ง
  obj.skills = jobSkills.map((js) => js.skill).filter(Boolean);
  return obj;
}

// ทักษะที่นายจ้างเลือก: ตัดตัวซ้ำ และต้องมีอยู่จริงในแคตตาล็อก
// (ถ้าบันทึก id ที่ไม่มีอยู่ หน้าเว็บและการแจ้งเตือนผู้ใช้ที่ทักษะตรงจะพังเมื่อ populate ได้ null)
// คืน null เมื่อมี id ที่ไม่รู้จัก
async function knownSkillIds(skills) {
  const ids = [...new Set(skills.map(String))];
  if (ids.length === 0) return [];
  const found = await Skill.countDocuments({ _id: { $in: ids } });
  return found === ids.length ? ids : null;
}

// ใช้ query เดียวดึงทักษะของงานทั้งหน้า แทนที่จะดึงทีละงาน
async function attachSkillsToAll(jobs) {
  const jobSkills = await JobSkill.find({ job: { $in: jobs.map((job) => job._id) } }).populate("skill");
  const skillsByJob = new Map();
  for (const jobSkill of jobSkills) {
    const key = String(jobSkill.job);
    if (!skillsByJob.has(key)) skillsByJob.set(key, []);
    if (jobSkill.skill) skillsByJob.get(key).push(jobSkill.skill);
  }
  return jobs.map((job) => ({ ...job.toObject(), skills: skillsByJob.get(String(job._id)) || [] }));
}

// รายการสาธารณะไม่ต้องล็อกอิน ดังนั้นแม้ไม่ส่ง ?page= ก็ยังคืนไม่เกินจำนวนนี้
const PUBLIC_UNPAGED_LIMIT = 200;

// สร้างตัวกรองรายการงานสาธารณะจาก query string ใช้ร่วมกันระหว่างรายการปกติ
// (เรียงตามวันที่ประกาศ) กับรายการที่เรียงตามความตรงของทักษะ
async function buildPublicListFilter(query) {
  const filter = { status: "open", verifiedStatus: "verified", $and: [{ $or: [{ expiredAt: null }, { expiredAt: { $gt: new Date() } }] }] };

  if (query.keyword) {
    const regex = new RegExp(escapeRegex(query.keyword), "i");
    filter.$or = [{ title: regex }, { description: regex }];
  }

  const locationConditions = [];
  if (query.location) {
    locationConditions.push({ location: new RegExp(escapeRegex(query.location), "i") });
  }
  if (query.province) {
    locationConditions.push({ location: new RegExp(escapeRegex(query.province), "i") });
  }
  if (locationConditions.length > 0) {
    filter.$and = (filter.$and || []).concat(locationConditions);
  }

  if (query.minSalary) {
    filter.salary = { ...filter.salary, $gte: Number(query.minSalary) };
  }
  if (query.maxSalary) {
    filter.salary = { ...filter.salary, $lte: Number(query.maxSalary) };
  }
  if (query.category) {
    filter.category = query.category;
  }
  if (query.deadlineWithinDays) {
    const cutoff = new Date(Date.now() + Number(query.deadlineWithinDays) * 24 * 60 * 60 * 1000);
    filter.expiredAt = { $exists: true, $ne: null, $lte: cutoff };
  }

  let jobIds = null;
  if (query.skill) {
    const jobSkills = await JobSkill.find({ skill: query.skill });
    jobIds = jobSkills.map((js) => js.job);
    filter._id = { $in: jobIds };
  }

  return filter;
}

export async function listJobs(req, res) {
  const filter = await buildPublicListFilter(req.query);

  const pagination = paginationOptions(req.query);
  const query = Job.find(filter)
    .populate("employer", EMPLOYER_PUBLIC_FIELDS)
    .populate("category")
    .sort({ createdAt: -1, _id: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await Job.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  } else {
    query.limit(PUBLIC_UNPAGED_LIMIT);
  }
  // ไม่แสดงประกาศของนายจ้างที่บัญชีถูกลบแล้ว
  const jobs = (await query).filter((job) => job.employer);
  res.json(await attachSkillsToAll(jobs));
}

// รายการงานสำหรับผู้หางานที่ล็อกอิน เรียงจากงานที่ทักษะของผู้ใช้ตรงมากไปน้อย
// ใช้สูตรเดียวกับป้าย "ทักษะตรง" บนการ์ด (ทักษะที่มี / ทักษะที่งานต้องการ) จึงเรียงตรงกับที่เห็น
// ต้องเรียงทั้งชุดที่ผ่านตัวกรองก่อนแบ่งหน้า ไม่เช่นนั้นงานที่ตรงมากในหน้าถัดไปจะตกหล่น
// เท่ากันให้งานที่ตรงจำนวนข้อมากกว่าก่อน แล้วจึงดูงานใหม่กว่า งานที่ไม่ระบุทักษะอยู่ท้ายสุด
export async function listJobsByMatch(req, res) {
  const filter = await buildPublicListFilter(req.query);
  const [mySkills, candidates] = await Promise.all([
    UserSkill.find({ user: req.user.id }).select("skill"),
    Job.find(filter).select("createdAt employer").populate("employer", "_id"),
  ]);
  // ไม่นับประกาศของนายจ้างที่บัญชีถูกลบแล้ว (เหมือนรายการปกติ)
  const live = candidates.filter((job) => job.employer);
  const mine = new Set(mySkills.map((item) => String(item.skill)));

  const requiredByJob = new Map();
  const jobSkills = await JobSkill.find({ job: { $in: live.map((job) => job._id) } }).select("job skill");
  for (const jobSkill of jobSkills) {
    const key = String(jobSkill.job);
    if (!requiredByJob.has(key)) requiredByJob.set(key, new Set());
    requiredByJob.get(key).add(String(jobSkill.skill));
  }

  const ranked = live
    .map((job) => {
      const required = requiredByJob.get(String(job._id));
      const matched = required ? [...required].filter((id) => mine.has(id)).length : 0;
      return { job, matched, score: required ? Math.round((matched / required.size) * 100) : -1 };
    })
    .sort((a, b) => b.score - a.score || b.matched - a.matched || b.job.createdAt - a.job.createdAt || String(b.job._id).localeCompare(String(a.job._id)));

  const pagination = paginationOptions(req.query);
  if (pagination) res.setHeader("X-Total-Count", ranked.length);
  const start = pagination ? pagination.skip : 0;
  const size = pagination ? pagination.limit : PUBLIC_UNPAGED_LIMIT;
  const pageIds = ranked.slice(start, start + size).map((item) => item.job._id);

  const docs = await Job.find({ _id: { $in: pageIds } }).populate("employer", EMPLOYER_PUBLIC_FIELDS).populate("category");
  const order = new Map(pageIds.map((id, index) => [String(id), index]));
  docs.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)));
  res.json(await attachSkillsToAll(docs.filter((job) => job.employer)));
}

// รายการที่บันทึกไว้ของผู้หางาน คืนเฉพาะงานที่ยังเผยแพร่สู่สาธารณะ
// งานที่บันทึกไว้แล้วปิดรับสมัครจึงหลุดออกจากรายการเอง
export async function mySavedJobs(req, res) {
  const saved = await SavedJob.find({ user: req.user.id }).sort({ createdAt: -1 }).select("job");
  const jobs = await Job.find({
    _id: { $in: saved.map((item) => item.job) },
    status: "open",
    verifiedStatus: "verified",
    $or: [{ expiredAt: null }, { expiredAt: { $gt: new Date() } }],
  })
    .populate("employer", EMPLOYER_PUBLIC_FIELDS)
    .populate("category");
  // นายจ้างที่ลบบัญชีแล้ว populate เป็น null งานนั้นเปิดดูไม่ได้แล้ว (หน้า /jobs/:id ตอบ 404) จึงไม่ส่งกลับ
  const visible = jobs.filter((job) => job.employer);
  const order = new Map(saved.map((item, index) => [item.job.toString(), index]));
  visible.sort((a, b) => order.get(a._id.toString()) - order.get(b._id.toString()));
  res.json(await attachSkillsToAll(visible));
}

export async function mySavedJobIds(req, res) {
  const saved = await SavedJob.find({ user: req.user.id }).select("job");
  res.json(saved.map((item) => item.job));
}

export async function saveJob(req, res) {
  const job = await Job.findOne({
    _id: req.params.id,
    status: "open",
    verifiedStatus: "verified",
    $or: [{ expiredAt: null }, { expiredAt: { $gt: new Date() } }],
  }).select("_id");
  if (!job) {
    return res.status(404).json({ message: "ไม่พบตำแหน่งงานนี้" });
  }
  await SavedJob.updateOne(
    { user: req.user.id, job: job._id },
    { $setOnInsert: { user: req.user.id, job: job._id } },
    { upsert: true }
  );
  res.status(201).json({ saved: true });
}

export async function unsaveJob(req, res) {
  await SavedJob.deleteOne({ user: req.user.id, job: req.params.id });
  res.json({ saved: false });
}

export async function getJob(req, res) {
  const job = await Job.findOne({
    _id: req.params.id,
    status: "open",
    verifiedStatus: "verified",
  })
    .populate("employer", `${EMPLOYER_PUBLIC_FIELDS} verifiedStatus`)
    .populate("category");
  if (!job || !job.employer) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(await attachSkills(job));
}

export async function listAllJobsForAdmin(req, res) {
  const filter = {};
  if (req.query.verifiedStatus) filter.verifiedStatus = req.query.verifiedStatus;
  const pagination = paginationOptions(req.query);
  const query = Job.find(filter)
    .populate("employer", EMPLOYER_ADMIN_FIELDS)
    .populate("category")
    .sort({ createdAt: -1, _id: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await Job.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  const jobs = (await query).filter((job) => job.employer);
  const withSkills = await Promise.all(jobs.map(attachSkills));
  res.json(withSkills);
}

export async function myJobs(req, res) {
  const filter = { employer: req.user.id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.verifiedStatus) filter.verifiedStatus = req.query.verifiedStatus;
  const pagination = paginationOptions(req.query);
  const query = Job.find(filter).populate("category").sort({ createdAt: -1, _id: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await Job.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  const jobs = await query;
  const withSkills = await Promise.all(jobs.map(attachSkills));
  res.json(withSkills);
}

// ประกาศงานของนายจ้างเองในทุกสถานะการตรวจสอบ (getJob สาธารณะ
// คืนเฉพาะงานที่เปิดและยืนยันแล้ว) แอดมินเปิดดูประกาศใดก็ได้
export async function getMyJob(req, res) {
  const filter = { _id: req.params.id };
  if (req.user.role !== "admin") filter.employer = req.user.id;
  const job = await Job.findOne(filter).populate("employer", EMPLOYER_ADMIN_FIELDS).populate("category");
  if (!job) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(await attachSkills(job));
}

// ตัวเลขสำหรับการ์ดแดชบอร์ดนายจ้าง ใน request เดียว แทนการเรียก
// applicants ทีละประกาศ
export async function myJobsSummary(req, res) {
  const jobs = await Job.find({ employer: req.user.id }).select("status verifiedStatus expiredAt");
  const now = new Date();
  const summary = { total: jobs.length, open: 0, pending: 0, rejected: 0, closed: 0 };
  for (const job of jobs) {
    if (job.verifiedStatus === "pending") summary.pending += 1;
    else if (job.verifiedStatus === "rejected") summary.rejected += 1;
    else if (job.status !== "open" || (job.expiredAt && job.expiredAt <= now)) summary.closed += 1;
    else summary.open += 1;
  }

  const byStatus = await Application.aggregate([
    { $match: { job: { $in: jobs.map((job) => job._id) } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const applicants = { total: 0, pending: 0, interview: 0, passed: 0, rejected: 0, cancelled: 0 };
  for (const item of byStatus) {
    applicants[item._id] = item.count;
    applicants.total += item.count;
  }
  res.json({ jobs: summary, applicants });
}

export async function createJob(req, res) {
  const { title, description, externalUrl, location, salary, expiredAt, category, attachmentRequests, skills } =
    req.body;
  const skillIds = Array.isArray(skills) ? await knownSkillIds(skills) : [];
  if (!skillIds) return res.status(400).json({ message: "มีทักษะที่ไม่อยู่ในรายการ กรุณาเลือกทักษะใหม่" });

  const job = await Job.create({
    title,
    description,
    externalUrl: externalUrl || undefined,
    location,
    salary: salary === "" ? undefined : salary,
    expiredAt: expiredAt || undefined,
    category: category || undefined,
    attachmentRequests,
    employer: req.user.id,
  });
  await job.populate("category");

  if (skillIds.length > 0) {
    await JobSkill.insertMany(skillIds.map((skillId) => ({ job: job._id, skill: skillId })));
  }

  res.status(201).json(await attachSkills(job));
}

export async function updateJob(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ message: "Not found" });
  }
  if (req.user.role !== "admin" && job.employer.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const skillIds = Array.isArray(req.body.skills) ? await knownSkillIds(req.body.skills) : undefined;
  if (skillIds === null) return res.status(400).json({ message: "มีทักษะที่ไม่อยู่ในรายการ กรุณาเลือกทักษะใหม่" });

  const contentBefore = moderatedContent(job);
  for (const field of EMPLOYER_EDITABLE_FIELDS) {
    if (req.body[field] === undefined) continue;
    job[field] = BLANKABLE_FIELDS.includes(field) && req.body[field] === "" ? undefined : req.body[field];
  }
  // การแก้ไขประกาศที่ถูกปฏิเสธจะส่งกลับไปตรวจใหม่ (การเปลี่ยนเฉพาะสถานะ
  // เช่นปิดรับสมัคร ไม่ต้องตรวจ) เช่นเดียวกับการแก้ส่วนที่ผู้ตรวจเคยอนุมัติ
  // ในประกาศที่เผยแพร่อยู่ ไม่เช่นนั้นจะสลับโฆษณาปกติเป็นโฆษณาอันตรายได้
  const editedRejected = job.verifiedStatus === "rejected" && Object.keys(req.body).some((key) => key !== "status");
  const editedApproved = job.verifiedStatus === "verified" && moderatedContent(job) !== contentBefore;
  const resubmitted = req.user.role === "employer" && (editedRejected || editedApproved);
  if (resubmitted) {
    job.verifiedStatus = "pending";
    job.rejectionReason = undefined;
  }
  await job.save();
  await job.populate("category");

  if (skillIds) {
    await JobSkill.deleteMany({ job: job._id });
    if (skillIds.length > 0) {
      await JobSkill.insertMany(skillIds.map((skillId) => ({ job: job._id, skill: skillId })));
    }
  }

  res.json(await attachSkills(job));
}

export async function deleteJob(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ message: "Not found" });
  }
  if (req.user.role !== "admin" && job.employer.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const applications = await Application.find({ job: job._id }).select("attachments");
  await Job.findByIdAndDelete(job._id);
  await JobSkill.deleteMany({ job: job._id });
  await Application.deleteMany({ job: job._id });
  removeUploadedImage(job.imageUrl);
  removeApplicationAttachments(applications);

  res.status(204).send();
}

export async function uploadJobImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const job = await Job.findById(req.params.id);
  if (!job || (req.user.role !== "admin" && job.employer.toString() !== req.user.id)) {
    fs.unlink(req.file.path, () => {});
    return res.status(job ? 403 : 404).json({ message: job ? "Forbidden" : "Not found" });
  }
  const previous = job.imageUrl;
  job.imageUrl = publicUrl("jobImage", req.file.filename);
  // รูปภาพใหม่บนประกาศที่เผยแพร่อยู่ ผู้ตรวจสอบยังไม่เคยเห็น
  if (req.user.role === "employer" && job.verifiedStatus === "verified") job.verifiedStatus = "pending";
  await job.save();
  removeUploadedImage(previous);
  res.json(await attachSkills(job));
}

export async function removeJobImage(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ message: "Not found" });
  }
  if (req.user.role !== "admin" && job.employer.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const previous = job.imageUrl;
  job.imageUrl = undefined;
  await job.save();
  removeUploadedImage(previous);
  res.json(await attachSkills(job));
}

export async function confirmJob(req, res) {
  const { status } = req.body;
  if (!["verified", "rejected"].includes(status)) {
    return res.status(400).json({ message: "status must be 'verified' or 'rejected'" });
  }

  const reason = typeof req.body.reason === "string" ? sanitizeText(req.body.reason).slice(0, 500) : "";
  const job = await Job.findByIdAndUpdate(
    req.params.id,
    {
      verifiedStatus: status,
      rejectionReason: status === "rejected" ? reason : "",
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
    },
    { new: true }
  );
  if (!job) {
    return res.status(404).json({ message: "Not found" });
  }

  const message =
    status === "verified"
      ? `ประกาศงาน "${job.title}" ได้รับการยืนยันแล้ว`
      : `ประกาศงาน "${job.title}" ถูกปฏิเสธ${reason ? ` เหตุผล: ${reason}` : ""}`;
  await notifyUser(job.employer, message, "job", { link: `/employer/jobs/${job._id}` });

  if (status === "verified") {
    await notifyMatchingUsersForJob(job);
  }

  res.json(await attachSkills(job));
}
