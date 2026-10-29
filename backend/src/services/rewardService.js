import User from "../models/User.js";
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

// แจ้งสมาชิกครอบครัวที่เชื่อมต่ออยู่ว่าถึงหมุดหมาย โดยไม่เปิดเผยว่าภารกิจ
// ใดหรือข้อมูลสุขภาพใดๆ — บอกแค่ว่ามีความคืบหน้า
// `message` ให้ผู้เรียกส่งประกาศหมุดหมายวันที่เฉพาะเจาะจงแทน
// ข้อความทั่วไป (เช่น ครบสตรีค 7/30/90/180/365 วัน)
export async function notifyLinkedFamily(recoveringUserId, message = DEFAULT_FAMILY_MESSAGE) {
  // หมุดหมายคือข้อมูลความก้าวหน้า จึงเป็นไปตามสวิตช์เดียวกับที่สรุปของครอบครัวยึดถือ:
  // เมื่อปิดการแชร์ความก้าวหน้า ครอบครัวจะไม่ได้ยินอะไร
  const recoveringUser = await User.findById(recoveringUserId).select("familySharing");
  if (recoveringUser?.familySharing?.progress === false) return;

  const links = await FamilyLink.find({ recoveringUser: recoveringUserId, status: "active" });
  for (const link of links) {
    await notifyUser(link.familyUser, message, "milestone", { link: "/family/dashboard" });
  }
}

// คะแนนสะสมถูกรวมจากเอกสาร UserMission ที่สำเร็จ
// เอกสาร ActivityMissionLog ที่บันทึก และเอกสาร GamePlay เสมอ
// ไม่ได้เก็บเป็นตัวนับที่แก้ไขได้ จึงไม่มีทางคลาดเคลื่อน
export async function getTotalPoints(userId) {
  const [completedMissions, activityLogs, gamePlays, familyMissionLogs] = await Promise.all([
    UserMission.find({ user: userId, completed: true }).populate("mission", "rewardPoints"),
    // บันทึกของภารกิจที่ต้องอนุมัติจะนับเมื่ออนุมัติแล้วเท่านั้น
    // `requiresApproval: { $ne: true }` ยังตรงกับบันทึกก่อน migration
    // ที่ยังไม่มีฟิลด์นี้ คะแนนของบันทึกเหล่านั้นจึงนับต่อเหมือนเดิม
    ActivityMissionLog.find({
      user: userId,
      $or: [{ requiresApproval: { $ne: true } }, { approved: true }],
    }).select("pointsAwarded"),
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
