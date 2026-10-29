import crypto from "crypto";
import FamilyLink from "../models/FamilyLink.js";
import User from "../models/User.js";
import UserMission from "../models/UserMission.js";
import UserReward from "../models/UserReward.js";
import { computeStreakStats } from "../services/streakService.js";
import { getTotalPoints } from "../services/rewardService.js";
import { sendFamilyInviteEmail } from "../services/emailService.js";
import { notifyUser } from "../services/notificationService.js";
import FamilyMessage from "../models/FamilyMessage.js";
import EmotionLog from "../models/EmotionLog.js";
import { sanitizeText } from "../utils/sanitizeText.js";
import { computeLevel } from "../utils/level.js";
import { counsellorCanAccessPatient } from "../utils/patientAccess.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// เกณฑ์และป้ายชื่อระดับของ PlantGrowth.jsx ที่คัดลอกมาไว้ที่นี่
// เพื่อให้สรุปของครอบครัวรายงานระดับได้โดยไม่เปิดเผยข้อมูลสุขภาพดิบ
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

  // ตามข้อกำหนดเชิญสมาชิกครอบครัวได้ครั้งละ 1 คนเท่านั้น: ต้องเพิกถอนคนเดิมก่อน
  // จึงจะเชิญคนอื่นได้
  const existingActive = await FamilyLink.findOne({
    recoveringUser: req.user.id,
    status: { $in: ["pending", "active"] },
  });
  if (existingActive) {
    return res.status(409).json({
      message: "คุณสามารถเชิญสมาชิกครอบครัวได้เพียง 1 คน กรุณายกเลิกคำเชิญ/สิทธิ์เดิมก่อนเชิญคนใหม่",
    });
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

  try {
    await sendFamilyInviteEmail(email, inviter.name, acceptUrl);
  } catch (err) {
    // ย้อนคำเชิญที่ค้างอยู่กลับ เพื่อไม่ให้การส่งที่ล้มเหลวบล็อกการลองใหม่ถาวร
    // ภายใต้กฎ "เชิญได้ครั้งละ 1 คน" ข้างต้น
    await FamilyLink.deleteOne({ _id: invite._id });
    throw err;
  }

  res.status(201).json({ _id: invite._id, inviteEmail: invite.inviteEmail, status: invite.status });
}

export async function acceptFamilyInvite(req, res) {
  const email = req.body.email?.toLowerCase();
  const recipient = await User.findById(req.user.id).select("email role");
  if (!recipient || recipient.email.toLowerCase() !== email || !["user", "family"].includes(recipient.role)) {
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

// ในมุมผู้ฟื้นฟู: แสดงคำเชิญและการเชื่อมต่อปัจจุบันของฉัน
// รายการที่ถูกเพิกถอนจะไม่แสดงเลย
export async function myInvitedFamily(req, res) {
  const links = await FamilyLink.find({ recoveringUser: req.user.id, status: { $ne: "revoked" } })
    .populate("familyUser", "name email avatarUrl avatarStyle avatarColor")
    .sort({ createdAt: -1 });
  res.json(links);
}

// สมาชิกครอบครัวขอติดตามผู้ป่วยด้วยอีเมลของผู้ป่วย คำตอบเป็นแบบเดียวกันเสมอ
// จึงใช้เช็กไม่ได้ว่าอีเมลนั้นเป็นของผู้ป่วยหรือไม่
// ผู้ป่วยตัดสินใจในโปรไฟล์ของตน (หรือเมินก็ได้)
export async function requestFamilyLink(req, res) {
  const email = req.body.email?.toLowerCase();
  const requester = await User.findById(req.user.id).select("name email role");
  const generic = { sent: true };
  if (!requester || !email || email === requester.email.toLowerCase()) return res.status(202).json(generic);

  const patient = await User.findOne({ email, role: "user" }).select("_id name");
  if (!patient) return res.status(202).json(generic);

  const existing = await FamilyLink.findOne({
    recoveringUser: patient._id,
    familyUser: requester._id,
    status: { $in: ["requested", "active"] },
  });
  if (existing) return res.status(202).json(generic);

  await FamilyLink.create({
    recoveringUser: patient._id,
    familyUser: requester._id,
    initiatedBy: "family",
    inviteEmail: requester.email.toLowerCase(),
    status: "requested",
  });
  await notifyUser(
    patient._id,
    `${requester.name} ขอเชื่อมต่อเพื่อติดตามความคืบหน้าและส่งกำลังใจให้คุณ โปรดตรวจสอบและอนุมัติในหน้าโปรไฟล์`,
    "familyRequest",
    { link: "/profile?tab=family" }
  );
  res.status(202).json(generic);
}

// ผู้ป่วยอนุมัติหรือปฏิเสธคำขอของสมาชิกครอบครัว
export async function respondToFamilyRequest(req, res) {
  const link = await FamilyLink.findOne({ _id: req.params.id, recoveringUser: req.user.id, status: "requested" });
  if (!link) {
    return res.status(404).json({ message: "ไม่พบคำขอนี้" });
  }

  const patient = await User.findById(req.user.id).select("name familyName");
  if (req.body.approve === true) {
    // กฎเดียวกับการเชิญ: สมาชิกครอบครัวได้ครั้งละหนึ่งคน
    const other = await FamilyLink.exists({
      recoveringUser: req.user.id,
      _id: { $ne: link._id },
      status: { $in: ["pending", "active"] },
    });
    if (other) {
      return res.status(409).json({ message: "คุณเชื่อมต่อสมาชิกครอบครัวได้เพียง 1 คน กรุณายกเลิกสิทธิ์เดิมก่อน" });
    }
    link.status = "active";
    await link.save();
    await notifyUser(link.familyUser, `${patient.name} อนุมัติคำขอของคุณแล้ว คุณสามารถติดตามความคืบหน้าและส่งกำลังใจได้`, "familyMessage", {
      link: "/family/dashboard",
    });
  } else {
    link.status = "revoked";
    await link.save();
    await notifyUser(link.familyUser, `${patient.name} ยังไม่พร้อมเชื่อมต่อกับคุณในตอนนี้`, "familyLinkRemoved", { link: "/family/dashboard" });
  }
  res.json(link);
}

export async function revokeFamilyLink(req, res) {
  const link = await FamilyLink.findById(req.params.id);
  if (!link) {
    return res.status(404).json({ message: "Not found" });
  }
  if (link.recoveringUser.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const wasActive = link.status === "active";
  link.status = "revoked";
  await link.save();

  if (wasActive && link.familyUser) {
    const recoveringUser = await User.findById(req.user.id).select("name");
    await notifyUser(
      link.familyUser,
      `${recoveringUser.name} ได้ยกเลิกการเชื่อมต่อครอบครัวกับคุณแล้ว คุณจะไม่เห็นความคืบหน้าของเขาอีก`,
      "familyLinkRemoved",
      { link: "/family/dashboard" }
    );
  }
  res.json(link);
}

// มุมมองเจ้าหน้าที่: ผู้ฟื้นฟูรายนี้เชื่อมต่อกับใครอยู่ ผู้ให้คำปรึกษา
// เห็นเฉพาะผู้ป่วยที่ได้รับมอบหมายให้ตน ตามกฎเดียวกับข้อมูลทางคลินิก
export async function listFamilyLinksForUser(req, res) {
  const { userId } = req.params;
  if (req.user.role === "counsellor" && !(await counsellorCanAccessPatient(req.user.id, userId))) {
    return res.status(403).json({ message: "คุณไม่ได้รับมอบหมายให้ดูแลผู้ใช้งานนี้" });
  }
  const links = await FamilyLink.find({ recoveringUser: userId, status: { $ne: "revoked" } })
    .populate("familyUser", "name email")
    .sort({ createdAt: -1 });
  res.json(links);
}

// ในมุมสมาชิกครอบครัว: แสดงผู้ฟื้นฟูที่ฉันเชื่อมต่ออยู่
// frontend ใช้ผลนี้ตัดสินว่าจะแสดงแดชบอร์ดครอบครัวแทนแดชบอร์ดผู้ใช้ปกติหรือไม่
export async function myFamilyLinksAsFamily(req, res) {
  const links = await FamilyLink.find({ familyUser: req.user.id, status: "active" }).populate(
    "recoveringUser",
    "name avatarUrl avatarStyle avatarColor familyName"
  );
  res.json(links);
}

// สร้างสรุปรูปแบบตายตัวที่คัดมาเองสำหรับมุมมองครอบครัว ฟังก์ชันนี้
// ห้าม query คะแนน/โน้ตใน EmotionLog, CounsellingSession หรือ
// RiskAssessment โดยตรงเกินกว่าที่ระบุไว้ชัดเจนที่นี่ —
// เพราะนี่คือสิ่งที่ทำให้มุมมองครอบครัวจำกัดอยู่เพียงข้อมูลระดับความสำเร็จได้อย่างปลอดภัย
export async function getLinkedUserSummary(req, res) {
  const link = await FamilyLink.findById(req.params.linkId);
  if (!link || link.status !== "active" || link.familyUser?.toString() !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const recoveringUser = await User.findById(link.recoveringUser).select("name avatarUrl avatarStyle avatarColor familyName familySharing");
  if (!recoveringUser) {
    return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้" });
  }
  const sharing = {
    progress: recoveringUser.familySharing?.progress !== false,
    missions: recoveringUser.familySharing?.missions !== false,
  };
  if (!sharing.progress) {
    return res.json({
      name: recoveringUser.name,
      familyName: recoveringUser.familyName,
      avatarUrl: recoveringUser.avatarUrl,
      avatarStyle: recoveringUser.avatarStyle,
      avatarColor: recoveringUser.avatarColor,
      sharing,
      rewardsEarned: [],
    });
  }

  const logs = await EmotionLog.find({ user: link.recoveringUser }).select("date happinessLevel");
  const streakStats = computeStreakStats(logs);

  const completedMissions = await UserMission.countDocuments({ user: link.recoveringUser, completed: true });
  const rewards = await UserReward.find({ user: link.recoveringUser })
    .populate("reward", "name icon")
    .sort({ earnedAt: -1 });
  // ระดับคำนวณจากคะแนนสะสมเท่านั้น (ภารกิจ/กิจกรรม/เกม)
  // ไม่ได้ดึงจากข้อมูลที่เกี่ยวข้องกับสุขภาพ — เปิดในมุมมองครอบครัวได้อย่างปลอดภัย
  const totalPoints = await getTotalPoints(link.recoveringUser);

  res.json({
    name: recoveringUser.name,
    familyName: recoveringUser.familyName,
    avatarUrl: recoveringUser.avatarUrl,
    avatarStyle: recoveringUser.avatarStyle,
    avatarColor: recoveringUser.avatarColor,
    sharing,
    currentStreak: streakStats.currentStreak,
    longestStreak: streakStats.longestStreak,
    currentStage: streakToStage(streakStats.currentStreak),
    currentStageLabel: STAGE_LABELS[streakToStage(streakStats.currentStreak)],
    completedMissions,
    level: await computeLevel(totalPoints),
    rewardsEarned: rewards.map((r) => ({ name: r.reward.name, icon: r.reward.icon, earnedAt: r.earnedAt })),
  });
}

// ข้อความระหว่างผู้ฟื้นฟูกับสมาชิกครอบครัวที่เชื่อมต่อกัน เขียนได้ทั้งสองฝ่าย
// ข้อความเก็บไว้ที่ลิงก์ (ประวัติจึงอยู่ต่อแม้ล้างการแจ้งเตือนแล้ว)
// และแจ้งเตือนด้วย notification
async function loadParticipantLink(linkId, userId) {
  const link = await FamilyLink.findById(linkId);
  if (!link || link.status !== "active") return null;
  const isFamily = link.familyUser?.toString() === userId;
  const isRecovering = link.recoveringUser?.toString() === userId;
  if (!isFamily && !isRecovering) return null;
  return { link, isFamily };
}

export async function sendEncouragementMessage(req, res) {
  const participant = await loadParticipantLink(req.params.linkId, req.user.id);
  if (!participant) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const { link, isFamily } = participant;

  const content = sanitizeText(req.body.message).slice(0, 500);
  if (!content) {
    return res.status(400).json({ message: "กรุณากรอกข้อความ" });
  }
  let replyTo;
  if (req.body.replyTo) {
    const parent = await FamilyMessage.findOne({ _id: req.body.replyTo, familyLink: link._id }).select("_id");
    replyTo = parent?._id;
  }

  const message = await FamilyMessage.create({
    familyLink: link._id,
    sender: req.user.id,
    senderRole: isFamily ? "family" : "user",
    content,
    replyTo,
  });

  const sender = await User.findById(req.user.id).select("name");
  await notifyUser(
    isFamily ? link.recoveringUser : link.familyUser,
    isFamily ? `${sender.name} ส่งกำลังใจถึงคุณ: "${content}"` : `${sender.name} ตอบกลับข้อความของคุณ: "${content}"`,
    "familyMessage",
    { link: isFamily ? "/dashboard" : "/family/dashboard" }
  );

  res.status(201).json({ sent: true, message });
}

export async function listFamilyMessages(req, res) {
  const participant = await loadParticipantLink(req.params.linkId, req.user.id);
  if (!participant) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 50));
  const messages = await FamilyMessage.find({ familyLink: participant.link._id }).sort({ createdAt: -1 }).limit(limit);
  res.json(messages);
}

// ข้อความจะค้างบนแดชบอร์ดตามเวลานี้หลังจากทำเครื่องหมายว่าอ่านแล้ว
// จากนั้นจึงให้ที่กับข้อความต้อนรับตามปกติ (ยังอยู่ในประวัติข้อความ)
export const READ_MESSAGE_VISIBLE_MS = 10 * 60 * 1000;

// สำหรับแดชบอร์ดของผู้ฟื้นฟู: ข้อความล่าสุดจากครอบครัว (ที่ยังไม่อ่านก่อน)
// เพื่อแสดงเด่นๆ พร้อมปุ่มอ่าน/ตอบ
export async function latestFamilyMessage(req, res) {
  const links = await FamilyLink.find({ recoveringUser: req.user.id, status: "active" }).select("_id familyUser");
  if (links.length === 0) return res.json({ message: null, unreadCount: 0 });

  const linkIds = links.map((link) => link._id);
  const [unreadCount, latestUnread] = await Promise.all([
    FamilyMessage.countDocuments({ familyLink: { $in: linkIds }, senderRole: "family", readAt: null }),
    FamilyMessage.findOne({ familyLink: { $in: linkIds }, senderRole: "family", readAt: null }).sort({ createdAt: -1 }),
  ]);
  const recentlyRead = { $gte: new Date(Date.now() - READ_MESSAGE_VISIBLE_MS) };
  const message =
    latestUnread ||
    (await FamilyMessage.findOne({ familyLink: { $in: linkIds }, senderRole: "family", readAt: recentlyRead }).sort({ createdAt: -1 }));
  if (!message) return res.json({ message: null, unreadCount: 0 });

  const link = links.find((item) => item._id.toString() === message.familyLink.toString());
  const family = link?.familyUser ? await User.findById(link.familyUser).select("name avatarUrl avatarStyle avatarColor") : null;
  res.json({ message, unreadCount, linkId: message.familyLink, family });
}

// ผู้รับ (ไม่ใช่ผู้ส่ง) เท่านั้นที่ทำเครื่องหมายว่าอ่านแล้วได้
export async function markFamilyMessageRead(req, res) {
  const message = await FamilyMessage.findById(req.params.id);
  if (!message) {
    return res.status(404).json({ message: "Not found" });
  }
  const participant = await loadParticipantLink(message.familyLink, req.user.id);
  if (!participant || message.sender.toString() === req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (!message.readAt) {
    message.readAt = new Date();
    await message.save();
  }
  res.json(message);
}
