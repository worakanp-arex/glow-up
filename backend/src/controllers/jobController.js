import Job from "../models/Job.js";
import { paginationOptions, escapeRegex } from "../utils/pagination.js";
import JobSkill from "../models/JobSkill.js";
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
// What the admin needs to judge whether an employer (and its posting) is legitimate.
const EMPLOYER_ADMIN_FIELDS = `${EMPLOYER_PUBLIC_FIELDS} email phone taxId address verifiedStatus`;
// Fields that arrive as "" from a blank form input mean "not set".
const BLANKABLE_FIELDS = ["externalUrl", "salary", "expiredAt", "category"];

async function attachSkills(job) {
  const jobSkills = await JobSkill.find({ job: job._id }).populate("skill");
  const obj = job.toObject();
  obj.skills = jobSkills.map((js) => js.skill);
  return obj;
}

export async function listJobs(req, res) {
  const filter = { status: "open", verifiedStatus: "verified", $and: [{ $or: [{ expiredAt: null }, { expiredAt: { $gt: new Date() } }] }] };

  if (req.query.keyword) {
    const regex = new RegExp(escapeRegex(req.query.keyword), "i");
    filter.$or = [{ title: regex }, { description: regex }];
  }

  const locationConditions = [];
  if (req.query.location) {
    locationConditions.push({ location: new RegExp(escapeRegex(req.query.location), "i") });
  }
  if (req.query.province) {
    locationConditions.push({ location: new RegExp(escapeRegex(req.query.province), "i") });
  }
  if (locationConditions.length > 0) {
    filter.$and = (filter.$and || []).concat(locationConditions);
  }

  if (req.query.minSalary) {
    filter.salary = { ...filter.salary, $gte: Number(req.query.minSalary) };
  }
  if (req.query.maxSalary) {
    filter.salary = { ...filter.salary, $lte: Number(req.query.maxSalary) };
  }
  if (req.query.category) {
    filter.category = req.query.category;
  }
  if (req.query.deadlineWithinDays) {
    const cutoff = new Date(Date.now() + Number(req.query.deadlineWithinDays) * 24 * 60 * 60 * 1000);
    filter.expiredAt = { $exists: true, $ne: null, $lte: cutoff };
  }

  let jobIds = null;
  if (req.query.skill) {
    const jobSkills = await JobSkill.find({ skill: req.query.skill });
    jobIds = jobSkills.map((js) => js.job);
    filter._id = { $in: jobIds };
  }

  const pagination = paginationOptions(req.query);
  const query = Job.find(filter)
    .populate("employer", EMPLOYER_PUBLIC_FIELDS)
    .populate("category")
    .sort({ createdAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await Job.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  const jobs = await query;
  const withSkills = await Promise.all(jobs.map(attachSkills));
  res.json(withSkills);
}

// Bookmarks for job seekers. Only jobs that are still publicly listed are
// returned, so a saved job that closes simply drops out of the list.
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
  const order = new Map(saved.map((item, index) => [item.job.toString(), index]));
  jobs.sort((a, b) => order.get(a._id.toString()) - order.get(b._id.toString()));
  res.json(await Promise.all(jobs.map(attachSkills)));
}

export async function mySavedJobIds(req, res) {
  const saved = await SavedJob.find({ user: req.user.id }).select("job");
  res.json(saved.map((item) => item.job));
}

export async function saveJob(req, res) {
  const job = await Job.findOne({ _id: req.params.id, status: "open", verifiedStatus: "verified" }).select("_id");
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
  if (!job) {
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
    .sort({ createdAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await Job.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  const jobs = await query;
  const withSkills = await Promise.all(jobs.map(attachSkills));
  res.json(withSkills);
}

export async function myJobs(req, res) {
  const filter = { employer: req.user.id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.verifiedStatus) filter.verifiedStatus = req.query.verifiedStatus;
  const pagination = paginationOptions(req.query);
  const query = Job.find(filter).populate("category").sort({ createdAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await Job.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  const jobs = await query;
  const withSkills = await Promise.all(jobs.map(attachSkills));
  res.json(withSkills);
}

// One of the employer's own postings in any moderation state (the public
// getJob only returns open + verified ones). Admins may open any posting.
export async function getMyJob(req, res) {
  const filter = { _id: req.params.id };
  if (req.user.role !== "admin") filter.employer = req.user.id;
  const job = await Job.findOne(filter).populate("employer", EMPLOYER_ADMIN_FIELDS).populate("category");
  if (!job) {
    return res.status(404).json({ message: "Not found" });
  }
  res.json(await attachSkills(job));
}

// Counts for the employer dashboard cards, in one request instead of one
// applicants call per posting.
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

  if (Array.isArray(skills) && skills.length > 0) {
    await JobSkill.insertMany(skills.map((skillId) => ({ job: job._id, skill: skillId })));
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

  for (const field of EMPLOYER_EDITABLE_FIELDS) {
    if (req.body[field] === undefined) continue;
    job[field] = BLANKABLE_FIELDS.includes(field) && req.body[field] === "" ? undefined : req.body[field];
  }
  // Editing a rejected posting resubmits it for review (a status-only change
  // such as closing it does not).
  const resubmitted = req.user.role === "employer" && job.verifiedStatus === "rejected" && Object.keys(req.body).some((key) => key !== "status");
  if (resubmitted) {
    job.verifiedStatus = "pending";
    job.rejectionReason = undefined;
  }
  await job.save();
  await job.populate("category");

  if (Array.isArray(req.body.skills)) {
    await JobSkill.deleteMany({ job: job._id });
    if (req.body.skills.length > 0) {
      await JobSkill.insertMany(req.body.skills.map((skillId) => ({ job: job._id, skill: skillId })));
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

  await Job.findByIdAndDelete(job._id);
  await JobSkill.deleteMany({ job: job._id });
  await Application.deleteMany({ job: job._id });
  removeUploadedImage(job.imageUrl);

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
