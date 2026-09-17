import ActivityMission from "../models/ActivityMission.js";
import ActivityMissionLog from "../models/ActivityMissionLog.js";
import { checkAndAwardRewards } from "../services/rewardService.js";
import { createCrudController } from "./crudFactory.js";
import { toBangkokDateKey } from "../utils/dateKey.js";

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

  const loggedMissionIds = new Set(todayLogs.map((log) => log.activityMission.toString()));

  res.json(
    activities.map((activity) => ({
      activity,
      loggedToday: loggedMissionIds.has(activity._id.toString()),
    }))
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
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "ทำภารกิจนี้ไปแล้ววันนี้" });
    }
    throw err;
  }

  const newlyEarnedRewards = await checkAndAwardRewards(req.user.id);

  res.status(201).json({ log, newlyEarnedRewards });
}

export async function myActivityHistory(req, res) {
  const logs = await ActivityMissionLog.find({ user: req.user.id })
    .populate("activityMission", "title category icon")
    .sort({ createdAt: -1 })
    .limit(30);
  res.json(logs);
}
