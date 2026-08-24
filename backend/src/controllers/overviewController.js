import CounsellingSession from "../models/CounsellingSession.js";
import RiskAssessment from "../models/RiskAssessment.js";
import LoginEvent from "../models/LoginEvent.js";
import User from "../models/User.js";
import { toBangkokDateKey, shiftDateKey } from "../utils/dateKey.js";

const APPOINTMENT_STATUSES = ["scheduled", "active"];

function dateKeyToBangkokDate(dateKey, endOfDay = false) {
  return new Date(`${dateKey}T${endOfDay ? "23:59:59" : "00:00:00"}+07:00`);
}

export async function getOverview(req, res) {
  const todayKey = toBangkokDateKey(new Date());
  const sevenDaysAgoKey = shiftDateKey(todayKey, -6);
  const fourteenDaysAgoKey = shiftDateKey(todayKey, -13);
  const thirtyDaysAgoKey = shiftDateKey(todayKey, -29);
  const sevenDaysAheadKey = shiftDateKey(todayKey, 6);

  const [activeUserIds, riskByLevelRaw, appointmentsByDayRaw, loginTrendRaw, leaderboardRaw] = await Promise.all([
    LoginEvent.distinct("user", { dateKey: { $gte: sevenDaysAgoKey } }),
    RiskAssessment.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$user", latestLevel: { $first: "$level" } } },
      { $group: { _id: "$latestLevel", count: { $sum: 1 } } },
    ]),
    CounsellingSession.aggregate([
      {
        $match: {
          status: { $in: APPOINTMENT_STATUSES },
          scheduledAt: { $gte: dateKeyToBangkokDate(todayKey), $lte: dateKeyToBangkokDate(sevenDaysAheadKey, true) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$scheduledAt", timezone: "Asia/Bangkok" } },
          users: { $addToSet: "$user" },
        },
      },
      { $project: { _id: 1, count: { $size: "$users" } } },
      { $sort: { _id: 1 } },
    ]),
    LoginEvent.aggregate([
      { $match: { dateKey: { $gte: fourteenDaysAgoKey } } },
      { $group: { _id: "$dateKey", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    LoginEvent.aggregate([
      { $match: { dateKey: { $gte: thirtyDaysAgoKey } } },
      { $group: { _id: "$user", days: { $sum: 1 } } },
      { $sort: { days: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const byLevel = { low: 0, medium: 0, high: 0 };
  for (const item of riskByLevelRaw) {
    byLevel[item._id] = item.count;
  }

  const appointmentsByDay = appointmentsByDayRaw.map((item) => ({ dateKey: item._id, count: item.count }));
  const todayEntry = appointmentsByDay.find((item) => item.dateKey === todayKey);

  const leaderboardUsers = await User.find({ _id: { $in: leaderboardRaw.map((r) => r._id) } }).select("name");
  const nameById = new Map(leaderboardUsers.map((u) => [u._id.toString(), u.name]));
  const leaderboard = leaderboardRaw.map((r) => ({
    userId: r._id,
    name: nameById.get(r._id.toString()) || "ไม่ทราบชื่อ",
    days: r.days,
  }));

  res.json({
    activeUsers: { count: activeUserIds.length, windowDays: 7 },
    risk: { byLevel },
    appointments: { today: todayEntry?.count ?? 0, byDay: appointmentsByDay },
    loginTrend: loginTrendRaw.map((item) => ({ dateKey: item._id, count: item.count })),
    leaderboard,
  });
}
