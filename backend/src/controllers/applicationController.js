import { applicationMatches } from "../services/jobMatchService.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { notifyUser } from "../services/notificationService.js";
import { publicUrl } from "../middleware/upload.js";

const STATUS_LABELS = {
  pending: "รอดำเนินการ",
  interview: "นัดสัมภาษณ์",
  passed: "ผ่านการคัดเลือก",
  rejected: "ถูกปฏิเสธ",
  cancelled: "ยกเลิกแล้ว",
};

const APPLICANT_PROFILE_FIELDS =
  "name email phone verifiedStatus education experience resumeUrl certificates avatarUrl";

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

  const application = await Application.create({ user: req.user.id, job: job._id, attachments });
  res.status(201).json(application);
}

export async function myApplications(req, res) {
  const applications = await Application.find({ user: req.user.id })
    .populate({ path: "job", populate: { path: "employer", select: "name companyName avatarUrl" } })
    .sort({ createdAt: -1 });
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

  const applications = await Application.find({ job: job._id })
    .populate("user", APPLICANT_PROFILE_FIELDS)
    .sort({ createdAt: -1 });
  res.json(applications);
}

export async function getApplication(req, res) {
  const application = await Application.findById(req.params.id)
    .populate("job")
    .populate("user", APPLICANT_PROFILE_FIELDS);
  if (!application) {
    return res.status(404).json({ message: "Not found" });
  }
  if (req.user.role !== "admin" && application.job.employer.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (!(await assertEmployerVerified(req, res))) return;
  res.json(application);
}

export async function updateApplicationStatus(req, res) {
  const { status, employerFeedback, rejectionReason } = req.body;
  if (!["pending", "interview", "passed", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const application = await Application.findById(req.params.id)
    .populate("job")
    .populate("user", APPLICANT_PROFILE_FIELDS);
  if (!application) {
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
