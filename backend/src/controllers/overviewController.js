import mongoose from "mongoose";
import CounsellingSession from "../models/CounsellingSession.js";
import RiskAssessment from "../models/RiskAssessment.js";
import LoginEvent from "../models/LoginEvent.js";
import User from "../models/User.js";
import ActivityMission from "../models/ActivityMission.js";
import ActivityMissionLog from "../models/ActivityMissionLog.js";
import GamePlay from "../models/GamePlay.js";
import UserMission from "../models/UserMission.js";
import FamilyMissionLog from "../models/FamilyMissionLog.js";
import ScenarioAttempt from "../models/ScenarioAttempt.js";
import ScenarioSimulation from "../models/ScenarioSimulation.js";
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

  // Totals are anonymous counts for everyone; only the named leaderboard is
  // limited to patients the viewer is allowed to see.
  const allowed = await accessiblePatientIds(req.user);
  const leaderboardMatch = { dateKey: { $gte: thirtyDaysAgoKey } };
  if (allowed) leaderboardMatch.user = { $in: [...allowed].map((id) => new mongoose.Types.ObjectId(id)) };

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
    // The "most frequent" ranking is about people in recovery, so staff and family logins stay out of it.
    LoginEvent.aggregate([
      { $match: leaderboardMatch },
      { $group: { _id: "$user", days: { $sum: 1 } } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", pipeline: [{ $match: { role: "user", deletedAt: null } }, { $project: { _id: 1 } }], as: "patient" } },
      { $match: { "patient.0": { $exists: true } } },
      { $sort: { days: -1 } },
      { $limit: 10 },
    ]),
  ]);

  // Everyone who signed in counts; the breakdown says who they are.
  const activeAccounts = await User.find({ _id: { $in: activeUserIds } }).select("role");
  const activeByRole = { user: 0, family: 0, counsellor: 0, employer: 0, admin: 0 };
  for (const account of activeAccounts) activeByRole[account.role] = (activeByRole[account.role] || 0) + 1;

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
    activeUsers: { count: activeAccounts.length, windowDays: 7, byRole: activeByRole },
    risk: { byLevel },
    appointments: { today: todayEntry?.count ?? 0, byDay: appointmentsByDay },
    loginTrend: loginTrendRaw.map((item) => ({ dateKey: item._id, count: item.count })),
    leaderboard,
  });
}

// Admins see everyone; a counsellor only sees the clinical detail (answers,
// risk levels) of patients who are assigned to them or have had a session with
// them — the same rule as utils/patientAccess.js, resolved in bulk.
async function accessiblePatientIds(user) {
  if (user.role === "admin") return null;
  const [assigned, sessionUserIds] = await Promise.all([
    User.find({ assignedCounsellor: user.id }).select("_id"),
    CounsellingSession.distinct("user", { counsellor: user.id }),
  ]);
  return new Set([...assigned.map((u) => String(u._id)), ...sessionUserIds.map(String)]);
}

function sinceDate(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function windowDays(req) {
  return Math.max(1, Math.min(90, Number.parseInt(req.query.days, 10) || 30));
}

async function pointsByUser() {
  const [activity, games, family, missions] = await Promise.all([
    ActivityMissionLog.aggregate([
      { $match: { $or: [{ requiresApproval: { $ne: true } }, { approved: true }] } },
      { $group: { _id: "$user", points: { $sum: "$pointsAwarded" } } },
    ]),
    GamePlay.aggregate([{ $group: { _id: "$user", points: { $sum: "$pointsAwarded" } } }]),
    FamilyMissionLog.aggregate([
      { $match: { completed: true } },
      { $group: { _id: "$recoveringUser", points: { $sum: "$pointsAwarded" } } },
    ]),
    UserMission.aggregate([
      { $match: { completed: true } },
      { $lookup: { from: "missions", localField: "mission", foreignField: "_id", as: "mission" } },
      { $unwind: "$mission" },
      { $group: { _id: "$user", points: { $sum: "$mission.rewardPoints" } } },
    ]),
  ]);
  const totals = new Map();
  for (const row of [...activity, ...games, ...family, ...missions]) {
    totals.set(String(row._id), (totals.get(String(row._id)) || 0) + (row.points || 0));
  }
  return totals;
}

// Participation overview for the analytics tabs: which daily missions, games
// and scenario exercises people use most, who scores highest, and how
// appointments ended up. No personal answers here (see getAttempts).
export async function getActivityOverview(req, res) {
  const days = windowDays(req);
  const since = sinceDate(days);
  // Counts above are anonymous; the named lists (top scorers, recent
  // appointments) only include patients the viewer is allowed to see.
  const allowed = await accessiblePatientIds(req.user);
  const recentFilter = { scheduledAt: { $gte: since, $lte: new Date() } };
  if (allowed) recentFilter.user = { $in: [...allowed] };

  const [missionLogs, gameRows, scenarioRows, statusRows, recentSessions, totals] = await Promise.all([
    ActivityMissionLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$activityMission", count: { $sum: 1 }, users: { $addToSet: "$user" } } },
      { $project: { count: 1, users: { $size: "$users" } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    GamePlay.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$gameType", plays: { $sum: 1 }, users: { $addToSet: "$user" }, points: { $sum: "$pointsAwarded" } } },
      { $project: { plays: 1, points: 1, users: { $size: "$users" } } },
      { $sort: { plays: -1 } },
    ]),
    ScenarioAttempt.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: "$scenario",
          attempts: { $sum: 1 },
          passed: { $sum: { $cond: ["$passed", 1, 0] } },
          users: { $addToSet: "$user" },
        },
      },
      { $project: { attempts: 1, passed: 1, users: { $size: "$users" } } },
      { $sort: { attempts: -1 } },
      { $limit: 20 },
    ]),
    CounsellingSession.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    CounsellingSession.find(recentFilter)
      .populate("user", "name")
      .populate("counsellor", "name")
      .select("topic status scheduledAt user counsellor")
      .sort({ scheduledAt: -1 })
      .limit(30),
    pointsByUser(),
  ]);

  const [missionDocs, scenarioDocs] = await Promise.all([
    ActivityMission.find({ _id: { $in: missionLogs.map((row) => row._id) } }).select("title category icon"),
    ScenarioSimulation.find({ _id: { $in: scenarioRows.map((row) => row._id) } }).select("title"),
  ]);
  const missionById = new Map(missionDocs.map((doc) => [String(doc._id), doc]));
  const scenarioById = new Map(scenarioDocs.map((doc) => [String(doc._id), doc]));

  const topUserIds = [...totals.entries()]
    .filter(([id]) => !allowed || allowed.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const topUsers = await User.find({ _id: { $in: topUserIds.map(([id]) => id) } }).select("name avatarUrl avatarStyle avatarColor");
  const userById = new Map(topUsers.map((u) => [String(u._id), u]));

  const byStatus = { pending: 0, active: 0, scheduled: 0, closed: 0, cancelled: 0 };
  for (const row of statusRows) byStatus[row._id] = row.count;

  res.json({
    windowDays: days,
    topMissions: missionLogs.map((row) => ({
      missionId: row._id,
      title: missionById.get(String(row._id))?.title || "ภารกิจที่ถูกลบ",
      category: missionById.get(String(row._id))?.category,
      count: row.count,
      users: row.users,
    })),
    games: gameRows.map((row) => ({ gameType: row._id, plays: row.plays, users: row.users, points: row.points })),
    scenarios: scenarioRows.map((row) => ({
      scenarioId: row._id,
      title: scenarioById.get(String(row._id))?.title || "สถานการณ์ที่ถูกลบ",
      attempts: row.attempts,
      passed: row.passed,
      passRate: row.attempts ? Math.round((row.passed / row.attempts) * 100) : 0,
      users: row.users,
    })),
    topScorers: topUserIds.map(([id, points]) => ({
      userId: id,
      name: userById.get(id)?.name || "ไม่ทราบชื่อ",
      avatarUrl: userById.get(id)?.avatarUrl,
      avatarStyle: userById.get(id)?.avatarStyle,
      avatarColor: userById.get(id)?.avatarColor,
      points,
    })),
    appointments: {
      byStatus,
      recent: recentSessions.map((session) => ({
        _id: session._id,
        topic: session.topic,
        status: session.status,
        scheduledAt: session.scheduledAt,
        user: session.user ? { _id: session.user._id, name: session.user.name } : null,
        counsellor: session.counsellor ? { _id: session.counsellor._id, name: session.counsellor.name } : null,
      })),
    },
  });
}

// Who took which exercise and what they answered. Personal answers are only
// returned for patients the viewer is allowed to see; `hidden` says how many
// attempts were left out so the page can explain the difference.
export async function getAttempts(req, res) {
  const days = windowDays(req);
  const since = sinceDate(days);
  const allowed = await accessiblePatientIds(req.user);

  const scenarioFilter = { createdAt: { $gte: since } };
  if (req.query.scenario) scenarioFilter.scenario = req.query.scenario;

  const [attempts, quizPlays] = await Promise.all([
    ScenarioAttempt.find(scenarioFilter).populate("user", "name avatarUrl avatarStyle avatarColor").sort({ createdAt: -1 }).limit(200),
    req.query.scenario
      ? []
      : GamePlay.find({ gameType: "quiz", createdAt: { $gte: since } })
          .populate("user", "name avatarUrl avatarStyle avatarColor")
          .sort({ createdAt: -1 })
          .limit(200),
  ]);

  const visible = (row) => row.user && (!allowed || allowed.has(String(row.user._id)));
  const scenarioDocs = await ScenarioSimulation.find({ _id: { $in: [...new Set(attempts.map((a) => String(a.scenario)))] } });
  const scenarioById = new Map(scenarioDocs.map((doc) => [String(doc._id), doc]));

  const visibleAttempts = attempts.filter(visible);
  const visibleQuiz = quizPlays.filter(visible);
  res.json({
    windowDays: days,
    hidden: attempts.length - visibleAttempts.length + (quizPlays.length - visibleQuiz.length),
    scenarioAttempts: visibleAttempts.map((attempt) => {
      const scenario = scenarioById.get(String(attempt.scenario));
      const option = scenario?.options?.[attempt.chosenOptionIndex];
      const correct = scenario?.options?.find((item) => item.isCorrect);
      return {
        _id: attempt._id,
        user: { _id: attempt.user._id, name: attempt.user.name, avatarUrl: attempt.user.avatarUrl, avatarStyle: attempt.user.avatarStyle, avatarColor: attempt.user.avatarColor },
        scenario: { _id: attempt.scenario, title: scenario?.title || "สถานการณ์ที่ถูกลบ", prompt: scenario?.prompt },
        chosenText: option?.text || "-",
        correctText: correct?.text,
        passed: attempt.passed,
        attemptedAt: attempt.attemptedAt || attempt.createdAt,
      };
    }),
    quizPlays: visibleQuiz.map((play) => ({
      _id: play._id,
      user: { _id: play.user._id, name: play.user.name, avatarUrl: play.user.avatarUrl, avatarStyle: play.user.avatarStyle, avatarColor: play.user.avatarColor },
      resultLabel: play.resultLabel,
      pointsAwarded: play.pointsAwarded,
      dateKey: play.dateKey,
    })),
  });
}

// The people behind a dashboard number: ?kind=active (signed in during the
// last 7 days), risk (latest assessment medium/high) or appointments (today).
export async function getOverviewUsers(req, res) {
  const kind = req.query.kind;
  const todayKey = toBangkokDateKey(new Date());

  if (kind === "active") {
    const allowed = await accessiblePatientIds(req.user);
    const rows = await LoginEvent.aggregate([
      { $match: { dateKey: { $gte: shiftDateKey(todayKey, -6) } } },
      { $group: { _id: "$user", lastLogin: { $max: "$dateKey" }, days: { $sum: 1 } } },
      { $sort: { lastLogin: -1, days: -1 } },
      { $limit: 200 },
    ]);
    const users = await User.find({ _id: { $in: rows.map((row) => row._id) } }).select("name role avatarUrl avatarStyle avatarColor");
    const userById = new Map(users.map((u) => [String(u._id), u]));
    // Family, staff and the other non-patient accounts are not clinical data, so only patients are held back from a counsellor.
    const visible = rows.filter((row) => {
      const role = userById.get(String(row._id))?.role;
      return (role && role !== "user") || !allowed || allowed.has(String(row._id));
    });
    return res.json({
      kind,
      total: rows.length,
      hidden: rows.length - visible.length,
      items: visible
        .filter((row) => userById.has(String(row._id)))
        .map((row) => ({ user: userById.get(String(row._id)), lastLogin: row.lastLogin, days: row.days })),
    });
  }

  if (kind === "risk") {
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "ผู้ดูแลระบบดูได้เฉพาะสรุปจำนวนตามระดับความเสี่ยง ไม่เห็นรายชื่อรายบุคคล" });
    }
    const allowed = await accessiblePatientIds(req.user);
    const rows = await RiskAssessment.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$user", level: { $first: "$level" }, createdAt: { $first: "$createdAt" }, riskScore: { $first: "$riskScore" } } },
      { $match: { level: { $in: ["medium", "high"] } } },
      { $sort: { createdAt: -1 } },
    ]);
    const visible = rows.filter((row) => !allowed || allowed.has(String(row._id)));
    const users = await User.find({ _id: { $in: visible.map((row) => row._id) } }).select("name avatarUrl avatarStyle avatarColor");
    const userById = new Map(users.map((u) => [String(u._id), u]));
    return res.json({
      kind,
      total: rows.length,
      hidden: rows.length - visible.length,
      items: visible
        .filter((row) => userById.has(String(row._id)))
        .map((row) => ({ user: userById.get(String(row._id)), level: row.level, riskScore: row.riskScore, assessedAt: row.createdAt })),
    });
  }

  if (kind === "appointments") {
    const allowed = await accessiblePatientIds(req.user);
    const start = new Date(`${todayKey}T00:00:00+07:00`);
    const end = new Date(`${todayKey}T23:59:59.999+07:00`);
    const allSessions = await CounsellingSession.find({ scheduledAt: { $gte: start, $lte: end }, status: { $in: ["scheduled", "active", "closed"] } })
      .populate("user", "name avatarUrl avatarStyle avatarColor")
      .populate("counsellor", "name")
      .sort({ scheduledAt: 1 });
    const sessions = allSessions.filter((session) => !allowed || (session.user && allowed.has(String(session.user._id))));
    return res.json({
      kind,
      total: allSessions.length,
      hidden: allSessions.length - sessions.length,
      items: sessions.map((session) => ({
        sessionId: session._id,
        user: session.user,
        counsellor: session.counsellor,
        topic: session.topic,
        status: session.status,
        scheduledAt: session.scheduledAt,
      })),
    });
  }

  res.status(400).json({ message: "kind must be 'active', 'risk' or 'appointments'" });
}
