import ActivityMission from "../models/ActivityMission.js";
import ActivityMissionLog from "../models/ActivityMissionLog.js";
import User from "../models/User.js";
import { checkAndAwardRewards } from "../services/rewardService.js";
import { notifyUser } from "../services/notificationService.js";
import { createCrudController } from "./crudFactory.js";
import { toBangkokDateKey, bangkokStartOfDay, bangkokEndOfDay, openWindowFilter } from "../utils/dateKey.js";
import { sanitizeText } from "../utils/sanitizeText.js";

const USER_LOG_FIELDS = "name avatarUrl avatarStyle avatarColor";

const { getAll, getOne } = createCrudController(ActivityMission);

export { getAll as listActivityMissions, getOne as getActivityMission };

const ACTIVITY_FIELDS = ["title", "description", "category", "icon", "points", "requiresApproval", "active"];

function activityFields(body) {
  const fields = {};
  for (const key of ACTIVITY_FIELDS) if (body[key] !== undefined) fields[key] = body[key];
  if (body.startDate !== undefined) fields.startDate = body.startDate ? bangkokStartOfDay(String(body.startDate).slice(0, 10)) : null;
  if (body.endDate !== undefined) fields.endDate = body.endDate ? bangkokEndOfDay(String(body.endDate).slice(0, 10)) : null;
  return fields;
}

export async function createActivityMission(req, res) {
  const fields = activityFields(req.body);
  if (fields.startDate && fields.endDate && fields.endDate < fields.startDate) {
    return res.status(400).json({ message: "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น" });
  }
  const doc = await ActivityMission.create({ ...fields, createdBy: req.user.id });
  res.status(201).json(doc);
}

export async function updateActivityMission(req, res) {
  const fields = activityFields(req.body);
  const doc = await ActivityMission.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ message: "Not found" });
  }
  doc.set(fields);
  if (doc.startDate && doc.endDate && doc.endDate < doc.startDate) {
    return res.status(400).json({ message: "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น" });
  }
  await doc.save();
  res.json(doc);
}

// Logs carry the points people earned, so a mission that has been logged is
// archived (hidden, `active: false`) rather than erased with its history.
export async function deleteActivityMission(req, res) {
  const doc = await ActivityMission.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ message: "Not found" });
  }
  const logCount = await ActivityMissionLog.countDocuments({ activityMission: doc._id });
  if (logCount > 0) {
    doc.active = false;
    await doc.save();
    return res.json({ archived: true, logCount, activityMission: doc });
  }
  await ActivityMission.findByIdAndDelete(doc._id);
  res.status(204).send();
}

export async function myTodayActivities(req, res) {
  const dateKey = toBangkokDateKey(new Date());
  const [activities, todayLogs] = await Promise.all([
    ActivityMission.find({ active: true, ...openWindowFilter() }).sort({ category: 1, createdAt: 1 }),
    ActivityMissionLog.find({ user: req.user.id, dateKey }),
  ]);

  const logByMissionId = new Map(todayLogs.map((log) => [log.activityMission.toString(), log]));

  res.json(
    activities.map((activity) => {
      const log = logByMissionId.get(activity._id.toString());
      return {
        activity,
        loggedToday: Boolean(log),
        approvalStatus: !log || !log.requiresApproval ? null : log.approved === true ? "approved" : log.approved === false ? "rejected" : "pending",
      };
    })
  );
}

export async function logActivity(req, res) {
  const activity = await ActivityMission.findOne({ _id: req.params.id, active: true, ...openWindowFilter() });
  if (!activity) {
    return res.status(404).json({ message: "ไม่พบภารกิจนี้หรือหมดช่วงเวลาทำภารกิจแล้ว" });
  }

  const { durationMinutes, distanceKm, fatigueLevel, enjoymentLevel, note } = req.body;
  const dateKey = toBangkokDateKey(new Date());

  let log;
  try {
    log = await ActivityMissionLog.create({
      user: req.user.id,
      activityMission: activity._id,
      category: activity.category,
      dateKey,
      durationMinutes: activity.category === "physical" ? durationMinutes : undefined,
      distanceKm: activity.category === "physical" ? distanceKm : undefined,
      fatigueLevel: activity.category === "physical" ? fatigueLevel : undefined,
      enjoymentLevel: activity.category === "physical" ? enjoymentLevel : undefined,
      note,
      pointsAwarded: activity.points,
      requiresApproval: activity.requiresApproval,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "ทำภารกิจนี้ไปแล้ววันนี้" });
    }
    throw err;
  }

  if (activity.requiresApproval) {
    const staff = await User.find({ role: { $in: ["admin", "counsellor"] } }).select("_id");
    const reportingUser = await User.findById(req.user.id).select("name");
    for (const member of staff) {
      await notifyUser(
        member._id,
        `${reportingUser.name} ทำภารกิจ "${activity.title}" รอการอนุมัติจากคุณ`,
        "system",
        { link: "/counsellor/activity-missions" }
      );
    }
  }

  // Points from an approval-required mission aren't counted until approved
  // (see rewardService.getTotalPoints), so skip the reward check for those.
  const newlyEarnedRewards = activity.requiresApproval ? [] : await checkAndAwardRewards(req.user.id);

  res.status(201).json({ log, newlyEarnedRewards });
}

export async function listPendingActivityApprovals(req, res) {
  const logs = await ActivityMissionLog.find({ requiresApproval: true, approved: null })
    .populate("user", USER_LOG_FIELDS)
    .populate("activityMission", "title category points")
    .sort({ createdAt: -1 });
  res.json(logs);
}

export async function reviewActivityLog(req, res) {
  const { approved } = req.body;
  const note = typeof req.body.note === "string" ? sanitizeText(req.body.note).slice(0, 500) : "";
  const log = await ActivityMissionLog.findOne({ _id: req.params.id, requiresApproval: true, approved: null });
  if (!log) {
    return res.status(404).json({ message: "ไม่พบรายการที่รออนุมัติ" });
  }

  log.approved = approved;
  if (!approved && note) log.reviewNote = note;
  log.approvedBy = req.user.id;
  log.approvedAt = new Date();
  await log.save();

  const activity = await ActivityMission.findById(log.activityMission).select("title");
  await notifyUser(
    log.user,
    approved
      ? `ภารกิจ "${activity?.title || ""}" ของคุณได้รับการอนุมัติแล้ว +${log.pointsAwarded} แต้ม`
      : `ภารกิจ "${activity?.title || ""}" ของคุณไม่ได้รับการอนุมัติ${note ? ` เหตุผล: ${note}` : ""}`,
    "system",
    { link: "/games" }
  );

  if (approved) {
    await checkAndAwardRewards(log.user);
  }

  res.json(log);
}

export async function myActivityHistory(req, res) {
  const logs = await ActivityMissionLog.find({ user: req.user.id })
    .populate("activityMission", "title category icon")
    .sort({ createdAt: -1 })
    .limit(30);
  res.json(logs);
}
