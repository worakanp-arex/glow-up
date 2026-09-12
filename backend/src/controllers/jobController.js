import Job from "../models/Job.js";
import { paginationOptions, escapeRegex } from "../utils/pagination.js";
import JobSkill from "../models/JobSkill.js";
import Application from "../models/Application.js";
import { notifyUser } from "../services/notificationService.js";

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

const EMPLOYER_PUBLIC_FIELDS = "name companyName avatarUrl businessType";

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
  const jobs = await Job.find()
    .populate("employer", EMPLOYER_PUBLIC_FIELDS)
    .populate("category")
    .sort({ createdAt: -1 });
  const withSkills = await Promise.all(jobs.map(attachSkills));
  res.json(withSkills);
}

export async function myJobs(req, res) {
  const jobs = await Job.find({ employer: req.user.id }).populate("category").sort({ createdAt: -1 });
  const withSkills = await Promise.all(jobs.map(attachSkills));
  res.json(withSkills);
}

export async function createJob(req, res) {
  const { title, description, externalUrl, location, salary, expiredAt, category, attachmentRequests, skills } =
    req.body;

  const job = await Job.create({
    title,
    description,
    externalUrl,
    location,
    salary,
    expiredAt,
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
    if (req.body[field] !== undefined) job[field] = req.body[field];
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

  res.status(204).send();
}

export async function confirmJob(req, res) {
  const { status } = req.body;
  if (!["verified", "rejected"].includes(status)) {
    return res.status(400).json({ message: "status must be 'verified' or 'rejected'" });
  }

  const job = await Job.findByIdAndUpdate(req.params.id, { verifiedStatus: status }, { new: true });
  if (!job) {
    return res.status(404).json({ message: "Not found" });
  }

  const message =
    status === "verified"
      ? `ประกาศงาน "${job.title}" ได้รับการยืนยันแล้ว`
      : `ประกาศงาน "${job.title}" ถูกปฏิเสธ`;
  await notifyUser(job.employer, message, "job");

  res.json(await attachSkills(job));
}
