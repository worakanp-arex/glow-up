import UserMission from "../models/UserMission.js";
import ActivityMissionLog from "../models/ActivityMissionLog.js";
import GamePlay from "../models/GamePlay.js";
import Reward from "../models/Reward.js";
import UserReward from "../models/UserReward.js";
import FamilyLink from "../models/FamilyLink.js";
import FamilyMissionLog from "../models/FamilyMissionLog.js";
import { notifyUser } from "./notificationService.js";
import { insertOnce } from "../utils/insertOnce.js";

const DEFAULT_FAMILY_MESSAGE = "มีความคืบหน้าใหม่ในเส้นทางฟื้นฟูที่คุณติดตามอยู่";

// Tells any actively-linked family member a milestone was reached, without
// revealing which mission or any health data — just that progress happened.
// `message` lets callers send a specific milestone-day announcement instead
// of the generic default (e.g. crossing a 7/30/90/180/365-day streak).
export async function notifyLinkedFamily(recoveringUserId, message = DEFAULT_FAMILY_MESSAGE) {
  const links = await FamilyLink.find({ recoveringUser: recoveringUserId, status: "active" });
  for (const link of links) {
    await notifyUser(link.familyUser, message, "milestone", { link: "/family/dashboard" });
  }
}

// Cumulative points are always summed from completed UserMission docs,
// logged ActivityMissionLog docs, and GamePlay docs rather than stored as a
// mutable counter, so they can never drift out of sync.
export async function getTotalPoints(userId) {
  const [completedMissions, activityLogs, gamePlays, familyMissionLogs] = await Promise.all([
    UserMission.find({ user: userId, completed: true }).populate("mission", "rewardPoints"),
    ActivityMissionLog.find({ user: userId }).select("pointsAwarded"),
    GamePlay.find({ user: userId }).select("pointsAwarded"),
    FamilyMissionLog.find({ recoveringUser: userId, completed: true }).select("pointsAwarded"),
  ]);

  const missionPoints = completedMissions.reduce((sum, um) => sum + (um.mission?.rewardPoints || 0), 0);
  const activityPoints = activityLogs.reduce((sum, log) => sum + (log.pointsAwarded || 0), 0);
  const gamePoints = gamePlays.reduce((sum, play) => sum + (play.pointsAwarded || 0), 0);
  const familyMissionPoints = familyMissionLogs.reduce((sum, log) => sum + (log.pointsAwarded || 0), 0);
  return missionPoints + activityPoints + gamePoints + familyMissionPoints;
}

export async function checkAndAwardRewards(userId) {
  const totalPoints = await getTotalPoints(userId);
  const earnedRewardIds = new Set(
    (await UserReward.find({ user: userId }).select("reward")).map((ur) => ur.reward.toString())
  );

  const eligibleRewards = await Reward.find({ pointsRequired: { $lte: totalPoints } });
  const newlyEarnedRewards = [];

  for (const reward of eligibleRewards) {
    if (earnedRewardIds.has(reward._id.toString())) continue;
    const created = await insertOnce(UserReward, { user: userId, reward: reward._id }, { earnedAt: new Date() });
    if (!created) continue;
    newlyEarnedRewards.push(reward);
    await notifyUser(userId, `คุณได้รับรางวัล "${reward.name}" แล้ว!`, "reward");
  }

  if (newlyEarnedRewards.length > 0) {
    await notifyLinkedFamily(userId);
  }

  return newlyEarnedRewards;
}
