import User from "../models/User.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import RiskAssessment from "../models/RiskAssessment.js";
import { getSetting, setSetting } from "../services/settingsService.js";
import { DEFAULT_POINTS_PER_LEVEL, POINTS_PER_LEVEL_SETTING_KEY } from "../utils/level.js";

export async function getDashboard(req, res) {
  const [
    usersByRole,
    pendingVerifications,
    totalJobs,
    pendingJobs,
    openJobs,
    totalApplications,
    applicationsByStatus,
    riskByLevel,
  ] = await Promise.all([
    User.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: "$role", count: { $sum: 1 } } }]),
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

  // `total` คือทุกบัญชีที่ยังใช้งานอยู่ ไม่ว่าบทบาทใด ส่วนที่เหลือคือรายละเอียดแยกตามบทบาท
  const roleCount = (role) => usersByRole.find((item) => item._id === role)?.count ?? 0;
  const roles = ["user", "family", "counsellor", "employer", "admin"];
  res.json({
    users: {
      total: roles.reduce((sum, role) => sum + roleCount(role), 0),
      patients: roleCount("user"),
      family: roleCount("family"),
      counsellors: roleCount("counsellor"),
      employers: roleCount("employer"),
      admins: roleCount("admin"),
      pendingVerifications,
    },
    jobs: { total: totalJobs, pending: pendingJobs, open: openJobs },
    applications: { total: totalApplications, byStatus },
    risk: { byLevel },
  });
}

export async function getPointsPerLevel(req, res) {
  const pointsPerLevel = await getSetting(POINTS_PER_LEVEL_SETTING_KEY, DEFAULT_POINTS_PER_LEVEL);
  res.json({ pointsPerLevel });
}

export async function updatePointsPerLevel(req, res) {
  const { pointsPerLevel } = req.body;
  await setSetting(POINTS_PER_LEVEL_SETTING_KEY, pointsPerLevel);
  res.json({ pointsPerLevel });
}
