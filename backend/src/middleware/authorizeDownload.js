import User from "../models/User.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import UserCourse from "../models/UserCourse.js";

export async function canDownloadFile(actor, fileUrl) {
  if (actor.role === "admin") return true;
  if (await User.exists({ _id: actor.id, $or: [{ resumeUrl: fileUrl }, { "certificates.url": fileUrl }] })) return true;
  if (await UserCourse.exists({ user: actor.id, certificateUrl: fileUrl })) return true;
  if (await Application.exists({ user: actor.id, "attachments.url": fileUrl })) return true;
  if (actor.role !== "employer") return false;
  const employer = await User.findById(actor.id).select("verifiedStatus");
  if (employer?.verifiedStatus !== "verified") return false;
  const jobs = await Job.find({ employer: actor.id }).select("_id");
  const jobIds = jobs.map((job) => job._id);
  if (await Application.exists({ job: { $in: jobIds }, "attachments.url": fileUrl })) return true;
  const owner = await User.findOne({ $or: [{ resumeUrl: fileUrl }, { "certificates.url": fileUrl }] }).select("_id");
  return Boolean(owner && await Application.exists({ job: { $in: jobIds }, user: owner._id }));
}

export async function authorizeDownload(req, res, next) {
  const { kind, filename } = req.params;
  if (!["resumes", "certificates", "application-attachments"].includes(kind) || !/^[\w.-]+$/.test(filename) || filename.includes("..")) {
    return res.status(404).json({ message: "ไม่พบเอกสาร" });
  }
  if (!await canDownloadFile(req.user, `/uploads/${kind}/${filename}`)) {
    return res.status(403).json({ message: "คุณไม่มีสิทธิ์เข้าถึงเอกสารนี้" });
  }
  next();
}
