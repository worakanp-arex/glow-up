import crypto from "crypto";
import FamilyLink from "../models/FamilyLink.js";
import User from "../models/User.js";
import UserMission from "../models/UserMission.js";
import UserReward from "../models/UserReward.js";
import { computeStreakStats } from "../services/streakService.js";
import { sendFamilyInviteEmail } from "../services/emailService.js";
import EmotionLog from "../models/EmotionLog.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// PlantGrowth.jsx's own stage thresholds and labels, mirrored here so the
// family summary can report a stage without exposing raw health data.
const STAGE_THRESHOLDS = [0, 1, 3, 7, 14, 30];
const STAGE_LABELS = [
  "เริ่มต้นวันนี้",
  "แตกหน่อแล้ว",
  "ต้นอ่อนกำลังโต",
  "เริ่มเป็นพุ่มไม้",
  "กลายเป็นต้นไม้เล็ก",
  "ต้นไม้ใหญ่แข็งแรง",
];

function streakToStage(streak) {
  let stage = 0;
  for (let i = STAGE_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (streak >= STAGE_THRESHOLDS[i]) {
      stage = i;
      break;
    }
  }
  return stage;
}

export async function inviteFamilyMember(req, res) {
  const email = req.body.email?.toLowerCase();
  if (!email) {
    return res.status(400).json({ message: "กรุณากรอกอีเมลของสมาชิกครอบครัว" });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const inviteTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const invite = await FamilyLink.create({
    recoveringUser: req.user.id,
    inviteEmail: email,
    inviteTokenHash,
    inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
    status: "pending",
  });

  const inviter = await User.findById(req.user.id).select("name");
  const acceptUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/family/accept?token=${rawToken}&email=${encodeURIComponent(email)}`;
  await sendFamilyInviteEmail(email, inviter.name, acceptUrl);

  res.status(201).json({ _id: invite._id, inviteEmail: invite.inviteEmail, status: invite.status });
}

export async function acceptFamilyInvite(req, res) {
  const email = req.body.email?.toLowerCase();
  const recipient = await User.findById(req.user.id).select("email role");
  if (!recipient || recipient.email.toLowerCase() !== email || recipient.role !== "user") {
    return res.status(403).json({ message: "กรุณาเข้าสู่ระบบด้วยบัญชีผู้ใช้งานที่ได้รับคำเชิญ" });
  }
  const { token } = req.body;
  const tokenHash = crypto.createHash("sha256").update(token || "").digest("hex");

  const invite = await FamilyLink.findOne({
    inviteEmail: email,
    inviteTokenHash: tokenHash,
    status: "pending",
    inviteExpiresAt: { $gt: new Date() },
  }).select("+inviteTokenHash");

  if (!invite) {
    return res.status(400).json({ message: "ลิงก์คำเชิญไม่ถูกต้องหรือหมดอายุ" });
  }

  const accepted = await FamilyLink.findOneAndUpdate(
    { _id: invite._id, status: "pending", inviteExpiresAt: { $gt: new Date() } },
    { $set: { familyUser: req.user.id, status: "active" } },
    { new: true }
  );
  if (!accepted) return res.status(409).json({ message: "คำเชิญนี้ถูกใช้หรือยกเลิกแล้ว" });
  res.json({ _id: accepted._id, status: accepted.status });
}

// As the recovering user: list who I've invited, so I can see status/revoke.
export async function myInvitedFamily(req, res) {
  const links = await FamilyLink.find({ recoveringUser: req.user.id }).sort({ createdAt: -1 });
  res.json(links);
}

export async function revokeFamilyLink(req, res) {
  const link = await FamilyLink.findById(req.params.id);
  if (!link) {
    return res.status(404).json({ message: "Not found" });
  }
  if (link.recoveringUser.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  link.status = "revoked";
  await link.save();
  res.json(link);
}

// As a family member: list the recovering users I'm actively linked to. The
// frontend uses this to decide whether to show the family dashboard instead
// of the normal user dashboard.
export async function myFamilyLinksAsFamily(req, res) {
  const links = await FamilyLink.find({ familyUser: req.user.id, status: "active" }).populate(
    "recoveringUser",
    "name avatarUrl"
  );
  res.json(links);
}

// Composes a fixed, hand-picked summary shape for the family view. This
// function must never query EmotionLog scores/notes, CounsellingSession, or
// RiskAssessment directly for anything beyond what's explicitly listed here —
// that's what keeps the family view safely limited to achievement-level data.
export async function getLinkedUserSummary(req, res) {
  const link = await FamilyLink.findById(req.params.linkId);
  if (!link || link.status !== "active" || link.familyUser?.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const recoveringUser = await User.findById(link.recoveringUser).select("name avatarUrl");
  const logs = await EmotionLog.find({ user: link.recoveringUser }).select("date happinessLevel");
  const streakStats = computeStreakStats(logs);

  const completedMissions = await UserMission.countDocuments({ user: link.recoveringUser, completed: true });
  const rewards = await UserReward.find({ user: link.recoveringUser })
    .populate("reward", "name icon")
    .sort({ earnedAt: -1 });

  res.json({
    name: recoveringUser.name,
    avatarUrl: recoveringUser.avatarUrl,
    currentStreak: streakStats.currentStreak,
    longestStreak: streakStats.longestStreak,
    currentStage: streakToStage(streakStats.currentStreak),
    currentStageLabel: STAGE_LABELS[streakToStage(streakStats.currentStreak)],
    completedMissions,
    rewardsEarned: rewards.map((r) => ({ name: r.reward.name, icon: r.reward.icon, earnedAt: r.earnedAt })),
  });
}
