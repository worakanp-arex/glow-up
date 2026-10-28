import { applicationMatches, jobApplicantMatches, mixedApplicationMatches } from "../services/jobMatchService.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { notifyUser } from "../services/notificationService.js";
import { publicUrl, removeUploadedFiles } from "../middleware/upload.js";
import { paginationOptions } from "../utils/pagination.js";

const STATUS_LABELS = {
  pending: "รอดำเนินการ",
  interview: "นัดสัมภาษณ์",
  passed: "ผ่านการคัดเลือก",
  rejected: "ถูกปฏิเสธ",
  cancelled: "ยกเลิกแล้ว",
};

// Basic personal details an employer sees alongside the application. Address
// and other contact-sensitive fields are deliberately left out.
const APPLICANT_PROFILE_FIELDS =
  "name nickname email phone age gender province bio verifiedStatus education experience resumeUrl certificates avatarUrl avatarStyle avatarColor";

// Once an applicant withdraws, the employer keeps the fact that the application
// existed but loses the applicant's contact details, profile and documents.
const WITHDRAWN_APPLICANT_FIELDS = ["_id", "name", "nickname", "avatarUrl", "avatarStyle", "avatarColor"];

function hideWithdrawnApplicantDetails(application, viewer) {
  if (viewer.role === "admin" || application.status !== "cancelled") return application;
  const plain = typeof application.toObject === "function" ? application.toObject() : application;
  const user = plain.user && typeof plain.user === "object"
    ? Object.fromEntries(WITHDRAWN_APPLICANT_FIELDS.filter((field) => plain.user[field] !== undefined).map((field) => [field, plain.user[field]]))
    : plain.user;
  return { ...plain, user, attachments: [] };
}

// Employers must be identity-verified before they can view or act on applicant
// data; admins bypass this check.
async function assertEmployerVerified(req, res) {
  if (req.user.role === "admin") return true;
  const employer = await User.findById(req.user.id).select("verifiedStatus");
  if (!employer || employer.verifiedStatus !== "verified") {
    res.status(403).json({
      message: "บัญชีนายจ้างของคุณยังไม่ได้รับการยืนยันตัวตน กรุณารอการตรวจสอบจากผู้ดูแลระบบ",
    });
    return false;
  }
  return true;
}

export async function applyToJob(req, res) {
  // Job seekers must be verified by an admin before their application (and
  // attached documents) reaches an employer.
  const applicant = await User.findById(req.user.id).select("verifiedStatus");
  if (applicant?.verifiedStatus !== "verified") {
    return res.status(403).json({
      message: "บัญชีของคุณยังไม่ได้รับการยืนยันจากผู้ดูแลระบบ จึงยังสมัครงานไม่ได้ กรุณารอการตรวจสอบ",
    });
  }

  const job = await Job.findById(req.params.jobId);
  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }
  if (job.status !== "open" || job.verifiedStatus !== "verified" || (job.expiredAt && job.expiredAt <= new Date())) {
    return res.status(400).json({ message: "This job is not open for applications" });
  }

  const existing = await Application.findOne({ user: req.user.id, job: job._id });
  if (existing) {
    return res.status(409).json({ message: "คุณสมัครงานนี้ไปแล้ว" });
  }

  const requiredNames = job.attachmentRequests || [];
  const files = req.files || [];
  if (requiredNames.length > 0 && files.length !== requiredNames.length) {
    return res.status(400).json({
      message: `กรุณาแนบไฟล์ให้ครบตามที่นายจ้างต้องการ: ${requiredNames.join(", ")}`,
    });
  }

  const attachments = requiredNames.map((name, i) => ({
    name,
    url: publicUrl("applicationAttachment", files[i].filename),
  }));
  // Anything uploaded beyond what the posting asked for is never referenced.
  removeUploadedFiles(files.slice(requiredNames.length));

  const application = await Application.create({ user: req.user.id, job: job._id, attachments });
  res.status(201).json(application);
}

export async function myApplications(req, res) {
  const filter = { user: req.user.id };
  const pagination = paginationOptions(req.query);
  const query = Application.find(filter)
    .populate({ path: "job", populate: { path: "employer", select: "name companyName avatarUrl avatarStyle avatarColor" } })
    .sort({ createdAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await Application.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  const applications = await query;
  res.json(await applicationMatches(req.user.id, applications));
}

export async function jobApplicants(req, res) {
  const job = await Job.findById(req.params.jobId);
  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }
  if (req.user.role !== "admin" && job.employer.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (!(await assertEmployerVerified(req, res))) return;

  const filter = { job: job._id };
  const pagination = paginationOptions(req.query);
  const query = Application.find(filter).populate("user", APPLICANT_PROFILE_FIELDS).sort({ createdAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await Application.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  // Applicants whose account was deleted are no longer shown.
  const applications = (await query).filter((application) => application.user);
  const withMatches = await jobApplicantMatches(job._id, applications);
  res.json(withMatches.map((application) => hideWithdrawnApplicantDetails(application, req.user)));
}

// Every application to any of the employer's postings (the dashboard's
// "all applicants" drill-down), optionally narrowed by status.
export async function listEmployerApplications(req, res) {
  if (!(await assertEmployerVerified(req, res))) return;
  const jobs = await Job.find({ employer: req.user.id }).select("_id");
  const filter = { job: { $in: jobs.map((job) => job._id) } };
  if (req.query.status) filter.status = req.query.status;
  const pagination = paginationOptions(req.query);
  const query = Application.find(filter)
    .populate("job", "title location salary description")
    .populate("user", APPLICANT_PROFILE_FIELDS)
    .sort({ createdAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await Application.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  const applications = (await query).filter((application) => application.user);
  // Each applicant is scored against the posting they applied to, so the list shows the skill match too.
  const withMatches = await mixedApplicationMatches(applications);
  res.json(withMatches.map((application) => hideWithdrawnApplicantDetails(application, req.user)));
}

// Admin overview of every application, optionally narrowed by status, for the
// dashboard drill-down.
export async function listAllApplications(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const pagination = paginationOptions(req.query);
  const query = Application.find(filter)
    .populate({ path: "job", select: "title location salary status verifiedStatus", populate: { path: "employer", select: "name companyName" } })
    .populate("user", APPLICANT_PROFILE_FIELDS)
    .sort({ createdAt: -1 });
  if (pagination) {
    res.setHeader("X-Total-Count", await Application.countDocuments(filter));
    query.skip(pagination.skip).limit(pagination.limit);
  }
  res.json((await query).filter((application) => application.user));
}

export async function getApplication(req, res) {
  const application = await Application.findById(req.params.id)
    .populate("job")
    .populate("user", APPLICANT_PROFILE_FIELDS);
  if (!application || !application.user) {
    return res.status(404).json({ message: "Not found" });
  }
  if (req.user.role !== "admin" && application.job.employer.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (!(await assertEmployerVerified(req, res))) return;
  const [withMatch] = await jobApplicantMatches(application.job._id, [application]);
  res.json(hideWithdrawnApplicantDetails(withMatch, req.user));
}

export async function updateApplicationStatus(req, res) {
  const { status, employerFeedback, rejectionReason } = req.body;
  if (!["pending", "interview", "passed", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const application = await Application.findById(req.params.id)
    .populate("job")
    .populate("user", APPLICANT_PROFILE_FIELDS);
  if (!application || !application.user) {
    return res.status(404).json({ message: "Not found" });
  }
  if (req.user.role !== "admin" && application.job.employer.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (!(await assertEmployerVerified(req, res))) return;
  if (application.status === "cancelled") {
    return res.status(400).json({ message: "ใบสมัครนี้ถูกยกเลิกโดยผู้สมัครแล้ว" });
  }

  application.status = status;
  if (employerFeedback !== undefined) application.employerFeedback = employerFeedback;
  if (rejectionReason !== undefined) application.rejectionReason = rejectionReason;
  await application.save();

  await notifyUser(
    application.user,
    `ใบสมัครตำแหน่ง "${application.job.title}" เปลี่ยนสถานะเป็น "${STATUS_LABELS[status]}"`,
    "job",
    { link: `/jobs/${application.job._id}?from=my-applications` }
  );

  res.json(application);
}

export async function cancelApplication(req, res) {
  const application = await Application.findById(req.params.id).populate("job");
  if (!application) {
    return res.status(404).json({ message: "Not found" });
  }
  if (application.user.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (["passed", "rejected", "cancelled"].includes(application.status)) {
    return res.status(400).json({ message: "ไม่สามารถยกเลิกใบสมัครที่ดำเนินการเสร็จสิ้นแล้วได้" });
  }

  application.status = "cancelled";
  await application.save();

  await notifyUser(
    application.job.employer,
    `ผู้สมัครยกเลิกใบสมัครตำแหน่ง "${application.job.title}"`,
    "job",
    { link: `/employer/applications/${application._id}` }
  );

  res.json(application);
}
