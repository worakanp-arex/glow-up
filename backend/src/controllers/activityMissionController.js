import ActivityMission from "../models/ActivityMission.js";
import ActivityMissionLog from "../models/ActivityMissionLog.js";
import User from "../models/User.js";
import { checkAndAwardRewards } from "../services/rewardService.js";
import { notifyUser } from "../services/notificationService.js";
import { createCrudController } from "./crudFactory.js";
import { toBangkokDateKey } from "../utils/dateKey.js";

const USER_LOG_FIELDS = "name avatarUrl";

const { getAll, getOne, create, update } = createCrudController(ActivityMission);

export { getAll as listActivityMissions, getOne as getActivityMission, create as createActivityMission, update as updateActivityMission };

export async function deleteActivityMission(req, res) {
  const doc = await ActivityMission.findByIdAndDelete(req.params.id);
  if (!doc) {
    return res.status(404).json({ message: "Not found" });
  }
  await ActivityMissionLog.deleteMany({ activityMission: doc._id });
  res.status(204).send();
}

export async function myTodayActivities(req, res) {
  const dateKey = toBangkokDateKey(new Date());
  const [activities, todayLogs] = await Promise.all([
    ActivityMission.find({ active: true }).sort({ category: 1, createdAt: 1 }),
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
  const activity = await ActivityMission.findOne({ _id: req.params.id, active: true });
  if (!activity) {
    return res.status(404).json({ message: "ไม่พบภารกิจนี้" });
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
  const log = await ActivityMissionLog.findOne({ _id: req.params.id, requiresApproval: true, approved: null });
  if (!log) {
    return res.status(404).json({ message: "ไม่พบรายการที่รออนุมัติ" });
  }

  log.approved = approved;
  log.approvedBy = req.user.id;
  log.approvedAt = new Date();
  await log.save();

  const activity = await ActivityMission.findById(log.activityMission).select("title");
  await notifyUser(
    log.user,
    approved
      ? `ภารกิจ "${activity?.title || ""}" ของคุณได้รับการอนุมัติแล้ว +${log.pointsAwarded} แต้ม`
      : `ภารกิจ "${activity?.title || ""}" ของคุณไม่ได้รับการอนุมัติ`,
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
