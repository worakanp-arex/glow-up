import User from "../models/User.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import RiskAssessment from "../models/RiskAssessment.js";

export async function getDashboard(req, res) {
  const [
    totalUsers,
    totalEmployers,
    pendingVerifications,
    totalJobs,
    pendingJobs,
    openJobs,
    totalApplications,
    applicationsByStatus,
    riskByLevel,
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "employer" }),
    User.countDocuments({ verifiedStatus: "pending" }),
    Job.countDocuments(),
    Job.countDocuments({ verifiedStatus: "pending" }),
    Job.countDocuments({ status: "open", verifiedStatus: "verified" }),
    Application.countDocuments(),
    Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    RiskAssessment.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$user", latestLevel: { $first: "$level" } } },
      { $group: { _id: "$latestLevel", count: { $sum: 1 } } },
    ]),
  ]);

  const byStatus = { pending: 0, interview: 0, passed: 0, rejected: 0 };
  for (const item of applicationsByStatus) {
    byStatus[item._id] = item.count;
  }

  const byLevel = { low: 0, medium: 0, high: 0 };
  for (const item of riskByLevel) {
    byLevel[item._id] = item.count;
  }

  res.json({
    users: { total: totalUsers, employers: totalEmployers, pendingVerifications },
    jobs: { total: totalJobs, pending: pendingJobs, open: openJobs },
    applications: { total: totalApplications, byStatus },
    risk: { byLevel },
  });
}
