import Mission from "../models/Mission.js";
import UserMission from "../models/UserMission.js";
import EmotionLog from "../models/EmotionLog.js";
import ScenarioAttempt from "../models/ScenarioAttempt.js";
import { computeStreakStats } from "../services/streakService.js";
import { notifyUser } from "../services/notificationService.js";
import { getTotalPoints, checkAndAwardRewards, notifyLinkedFamily } from "../services/rewardService.js";
import { createCrudController } from "./crudFactory.js";
import { insertOnce } from "../utils/insertOnce.js";

const { getAll, getOne, create, update, remove } = createCrudController(Mission);

export {
  getAll as listMissions,
  getOne as getMission,
  create as createMission,
  update as updateMission,
  remove as deleteMission,
};

async function currentValueForMission(userId, mission, streakStats) {
  if (mission.type === "streak") return streakStats.currentStreak;
  if (mission.type === "totalCheckins") return streakStats.totalCheckIns;
  if (mission.type === "scenarioCompleted") {
    return ScenarioAttempt.countDocuments({ user: userId, passed: true });
  }
  // "custom" missions are completed manually (e.g. by an admin), not
  // recomputed here.
  return null;
}

// Recomputes mission progress for a user against their current activity, and
// awards any missions/rewards newly reached. Cumulative points are always
// summed from completed UserMission docs rather than stored as a mutable
// counter, so they can never drift out of sync.
export async function checkAndAwardMissions(userId) {
  const logs = await EmotionLog.find({ user: userId }).select("date happinessLevel");
  const streakStats = computeStreakStats(logs);

  const missions = await Mission.find({
    active: true,
    type: { $in: ["streak", "totalCheckins", "scenarioCompleted"] },
  });
  const newlyCompletedMissions = [];

  for (const mission of missions) {
    const currentValue = await currentValueForMission(userId, mission, streakStats);
    if (currentValue === null) continue;

    const progress = Math.min(currentValue, mission.targetValue);
    const justCompleted = currentValue >= mission.targetValue;

    const identity = { user: userId, mission: mission._id };
    await insertOnce(UserMission, identity, { progress: 0, completed: false });

    const changes = { progress };
    if (justCompleted) {
      changes.completed = true;
      changes.completedAt = new Date();
    }

    const userMission = await UserMission.findOneAndUpdate(
      { ...identity, completed: false },
      { $set: changes },
      { new: true }
    );

    if (justCompleted && userMission) {
      newlyCompletedMissions.push({ mission, userMission });
    }
  }

  if (newlyCompletedMissions.length > 0) {
    for (const { mission } of newlyCompletedMissions) {
      await notifyUser(userId, `คุณสำเร็จภารกิจ "${mission.title}" แล้ว!`, "reward", { link: "/streak" });
    }
    await notifyLinkedFamily(userId, newlyCompletedMissions.length);
  }

  const newlyEarnedRewards = await checkAndAwardRewards(userId);

  return { newlyCompletedMissions, newlyEarnedRewards };
}

export async function myMissionProgress(req, res) {
  await checkAndAwardMissions(req.user.id);

  const missions = await Mission.find({ active: true }).sort({ targetValue: 1 });
  const userMissions = await UserMission.find({ user: req.user.id });
  const progressByMission = new Map(userMissions.map((um) => [um.mission.toString(), um]));

  const result = missions.map((mission) => {
    const um = progressByMission.get(mission._id.toString());
    return {
      mission,
      progress: um?.progress || 0,
      completed: um?.completed || false,
      completedAt: um?.completedAt || null,
    };
  });

  res.json(result);
}

export async function myPointsSummary(req, res) {
  await checkAndAwardMissions(req.user.id);
  const totalPoints = await getTotalPoints(req.user.id);
  const completedMissions = await UserMission.countDocuments({ user: req.user.id, completed: true });
  res.json({ totalPoints, completedMissions });
}
