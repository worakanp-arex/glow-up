// สคริปต์สร้าง "ผู้ใช้และกิจกรรมตัวอย่าง" สำหรับสาธิตระบบให้เห็นทุกฟังก์ชัน
// (seedDemo.js สร้างเฉพาะเนื้อหา ส่วนไฟล์นี้สร้างคน ใบสมัคร แบบประเมิน และประวัติการใช้งาน)
//
// สิ่งที่สร้าง: ผู้ป่วย 28 คน (ความเสี่ยงสูง/ปานกลาง/ต่ำ), ผู้ให้คำปรึกษา, นายจ้าง, ครอบครัว,
// งาน + ใบสมัครทุกสถานะ, คอร์สและการลงทะเบียน, บันทึกอารมณ์ 100 วัน, ผลประเมินความเสี่ยง,
// แบบประเมินรายสัปดาห์, สถานการณ์เสี่ยง, นัดปรึกษา, ภารกิจ เกม รางวัล ชุมชน และการแจ้งเตือน
//
// ความปลอดภัย: ทำงานกับฐานข้อมูลในเครื่องเท่านั้น (รหัสผ่านตัวอย่างเปิดเผยอยู่ใน repo)
// ไม่แก้ไข/ลบข้อมูลเดิม เพิ่มเฉพาะข้อมูลของบัญชีที่อีเมลลงท้าย @demo.glowup.example
//
// วิธีใช้:
//   node src/config/seedDemoPeople.js           สร้างข้อมูล (หยุดถ้ามีข้อมูลตัวอย่างอยู่แล้ว)
//   node src/config/seedDemoPeople.js --reset   ลบข้อมูลตัวอย่างเดิมแล้วสร้างใหม่
//   node src/config/seedDemoPeople.js --clean   ลบเฉพาะข้อมูลตัวอย่าง
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "./db.js";
import { assertLocalDatabase } from "./localOnly.js";
import { BCRYPT_COST } from "../utils/passwordPolicy.js";
import { toBangkokDateKey, shiftDateKey, toIsoWeekKey, bangkokStartOfDay, bangkokEndOfDay, isWithinWindow } from "../utils/dateKey.js";
import { detectMeetingPlatform } from "../utils/meetingLink.js";
import { assessRisk } from "../services/riskPredictionService.js";
import { ensureDefaultSkills } from "../services/skillCatalogService.js";
import { checkAndAwardMissions } from "../controllers/missionController.js";
import { DEFAULT_SKILLS } from "../constants/skills.js";
import { WHEEL_SEGMENTS } from "../constants/gameContent.js";
import User from "../models/User.js";
import EmotionLog from "../models/EmotionLog.js";
import RiskAssessment from "../models/RiskAssessment.js";
import WeeklyCheckIn from "../models/WeeklyCheckIn.js";
import RiskSituationLog from "../models/RiskSituationLog.js";
import RehabilitationRecord from "../models/RehabilitationRecord.js";
import Goal from "../models/Goal.js";
import Skill from "../models/Skill.js";
import UserSkill from "../models/UserSkill.js";
import Job from "../models/Job.js";
import JobCategory from "../models/JobCategory.js";
import JobSkill from "../models/JobSkill.js";
import Application from "../models/Application.js";
import SavedJob from "../models/SavedJob.js";
import Course from "../models/Course.js";
import UserCourse from "../models/UserCourse.js";
import MicroLesson from "../models/MicroLesson.js";
import SavedLesson from "../models/SavedLesson.js";
import ScenarioSimulation from "../models/ScenarioSimulation.js";
import ScenarioAttempt from "../models/ScenarioAttempt.js";
import ActivityMission from "../models/ActivityMission.js";
import ActivityMissionLog from "../models/ActivityMissionLog.js";
import GamePlay from "../models/GamePlay.js";
import UserMission from "../models/UserMission.js";
import UserReward from "../models/UserReward.js";
import CounsellingSession from "../models/CounsellingSession.js";
import FamilyLink from "../models/FamilyLink.js";
import FamilyMessage from "../models/FamilyMessage.js";
import FamilyMission from "../models/FamilyMission.js";
import FamilyMissionLog from "../models/FamilyMissionLog.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import SavedPost from "../models/SavedPost.js";
import Notification from "../models/Notification.js";
import LoginEvent from "../models/LoginEvent.js";
import {
  DEMO_EMAIL_DOMAIN, DEMO_PASSWORD, demoEmail, COUNSELLORS, EMPLOYERS, FAMILY_ACCOUNTS, PENDING_INVITES, PATIENTS,
  NEW_JOB_CATEGORIES, JOBS, REJECTION_REASONS, EMPLOYER_FEEDBACKS, COURSES, NEW_ACTIVITY_MISSIONS, POSTS, COMMENT_TEXTS,
  EMOTION_NOTES, WEEKLY_NOTES, RISK_SITUATIONS, SESSION_TOPICS, COUNSELLOR_REPLIES, USER_REPLIES, OUTCOME_SUMMARIES,
  FAMILY_TO_USER, USER_TO_FAMILY, GOALS, REHAB_PLACES,
} from "./demoCatalog.js";

dotenv.config();

const EMOTION_DAYS = 100; // จำนวนวันย้อนหลังของบันทึกอารมณ์ (ครอบคลุมสตรีคยาวสุด 92 วัน)
const DEMO_EMAIL_PATTERN = new RegExp(`@${DEMO_EMAIL_DOMAIN.replace(/\./g, "\\.")}$`);
const AVATAR_COLORS = ["#4F9CF9", "#F59E0B", "#10B981", "#EF6C8F", "#8B5CF6", "#14B8A6", "#F97316", "#6366F1"];

// ---------------------------------------------------------------------------
// ตัวช่วยสุ่ม (กำหนด seed ตายตัว เพื่อให้รันซ้ำแล้วได้ข้อมูลหน้าตาเดิม)
// ---------------------------------------------------------------------------

function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, items) => items[Math.floor(rng() * items.length)];
const randInt = (rng, low, high) => low + Math.floor(rng() * (high - low + 1));
const chance = (rng, probability) => rng() < probability;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
function sample(rng, items, count) {
  const pool = [...items];
  const out = [];
  while (pool.length && out.length < count) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}
function weighted(rng, entries) {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

// ---------------------------------------------------------------------------
// ตัวช่วยเรื่องวันเวลา (ทุกอย่างอ้างอิงวันตามเวลาประเทศไทย)
// ---------------------------------------------------------------------------

const NOW = new Date();
const TODAY = toBangkokDateKey(NOW);
const keyAgo = (days) => shiftDateKey(TODAY, -days);
const pad = (n) => String(n).padStart(2, "0");
// เวลาตามวันที่ที่ระบุ (ไม่จำกัดอนาคต ใช้กับนัดหมาย)
const atTime = (dateKey, hour = 12, minute = 0) => new Date(`${dateKey}T${pad(hour)}:${pad(minute)}:00+07:00`);
// เวลาในอดีตเท่านั้น ถ้าเลยเวลาปัจจุบันให้ใช้เวลาปัจจุบัน (กันบันทึกที่ "มาจากอนาคต")
const atPast = (dateKey, hour = 12, minute = 0) => {
  const t = atTime(dateKey, hour, minute);
  return t > NOW ? new Date(NOW.getTime() - 60 * 1000) : t;
};
const emailFor = (key) => demoEmail(`${{ p: "patient", e: "employer", c: "counsellor", f: "family" }[key[0]]}${key.slice(1)}`);

// ---------------------------------------------------------------------------
// บันทึกอารมณ์: สร้างให้ผลประเมินความเสี่ยงของระบบออกมาตรงกับระดับที่ตั้งใจ
// ---------------------------------------------------------------------------

const RISK_BASE = {
  high: { craving: 7.8, happy: 2.6, miss: 0.22 },
  medium: { craving: 5.0, happy: 4.0, miss: 0.18 },
  low: { craving: 2.2, happy: 5.4, miss: 0.1 },
};
const TREND_SIGN = { worsening: 1, improving: -1, steady: 0 };

function generateEmotionLogs(patient, rng) {
  const base = RISK_BASE[patient.risk];
  const sign = TREND_SIGN[patient.trend];
  // วันเริ่มต้นของช่วงที่เช็คอินติดต่อกัน: ถ้าวันนี้ยังไม่เช็คอินให้เริ่มจากเมื่อวาน
  // ส่วนคนที่ไม่ได้เช็คอินมานาน (streak = 0) ให้ขาดไป silentDays วัน
  const start = patient.streak > 0 ? (patient.today ? 0 : 1) : patient.silentDays ?? 6;
  const runEnd = start + patient.streak; // วันแรกที่สตรีคขาด
  const logs = [];
  for (let d = 0; d < EMOTION_DAYS; d += 1) {
    let logged;
    if (d < start) logged = false;
    else if (d < runEnd) logged = true;
    else if (d === runEnd) logged = false;
    else logged = !chance(rng, base.miss);
    if (!logged) continue;

    // tt: -0.5 = วันนี้, +0.5 = 30 วันก่อน (ค่าเฉลี่ย 30 วันยังอยู่ที่ค่าฐาน)
    const tt = Math.min(d / 30, 1.5) - 0.5;
    const craving = clamp(Math.round(base.craving - sign * 2.4 * tt + (rng() - 0.5) * 3.2), 1, 10);
    const happy = clamp(Math.round(base.happy + sign * 1.4 * tt + (rng() - 0.5) * 2), 1, 7);
    const dateKey = keyAgo(d);
    logs.push({
      dateKey,
      date: atPast(dateKey, randInt(rng, 7, 21), randInt(rng, 0, 59)),
      happinessLevel: happy,
      cravingLevel: craving,
      context: pick(rng, ["work", "family", "environment", "other"]),
      note: chance(rng, 0.3) ? pick(rng, EMOTION_NOTES[patient.risk]) : undefined,
    });
  }
  return logs; // เรียงจากใหม่ไปเก่า
}

async function buildEmotionLogs(patient, index) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const rng = makeRng(7919 * (index + 1) + attempt * 104729);
    const logs = generateEmotionLogs(patient, rng);
    if (logs.length < 10) continue;
    const { level } = await assessRisk(null, logs.slice(0, 30));
    if (level === patient.risk) return logs;
  }
  throw new Error(`สร้างบันทึกอารมณ์ของ ${patient.name} ให้ได้ระดับ ${patient.risk} ไม่สำเร็จ`);
}

// ประวัติการประเมินความเสี่ยงย้อนหลังรายสัปดาห์ ใช้สูตรจริงของระบบ
async function buildRiskAssessments(userId, logs) {
  const out = [];
  for (let week = 0; week < 8; week += 1) {
    // สัปดาห์ล่าสุดประเมินจากบันทึกล่าสุดของผู้ใช้ สัปดาห์ก่อนหน้านั้นย้อนทีละ 7 วัน
    const refKey = week === 0 ? logs[0].dateKey : keyAgo(week * 7);
    const window = logs.filter((log) => log.dateKey <= refKey).slice(0, 30);
    if (window.length < 3) break;
    const result = await assessRisk(null, window);
    const createdAt = week === 0 ? new Date(window[0].date.getTime() + 60 * 1000) : atPast(refKey, 21);
    out.push({ user: userId, riskScore: result.riskScore, level: result.level, triggerFactors: result.triggerFactors, createdAt, updatedAt: createdAt });
  }
  return out;
}

// ---------------------------------------------------------------------------
// ขั้นตอนหลักของการสร้างข้อมูล
// ---------------------------------------------------------------------------

async function seed() {
  const stats = {};
  const bump = (name, count) => { stats[name] = (stats[name] || 0) + count; };

  // ข้อมูลเดิมที่ต้องอ้างอิง (ไม่แก้ไข)
  const admins = await User.find({ role: "admin" }).select("_id");
  const existingCounsellor = await User.findOne({ role: "counsellor" }).sort({ createdAt: 1 }).select("_id name");

  // --- 1) บัญชีผู้ใช้ทั้งหมด -------------------------------------------------
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);
  const baseAccount = { password: passwordHash, pdpaConsent: true, pdpaConsentAt: atPast(keyAgo(120)), verifiedStatus: "verified" };

  const counsellorDocs = await User.insertMany(
    COUNSELLORS.map((c) => ({ ...baseAccount, name: c.name, email: emailFor(c.key), role: "counsellor", specialization: c.specialization, hospital: c.hospital, bio: c.bio, createdAt: atPast(keyAgo(150)) }))
  );
  const counsellorId = Object.fromEntries(COUNSELLORS.map((c, i) => [c.key, counsellorDocs[i]._id]));
  // ผู้ให้คำปรึกษา "p" คือบัญชีที่มีอยู่เดิม (ใช้สาธิตด้วยบัญชีจริงของผู้พรีเซนต์) ถ้าไม่มีจะใช้บัญชีตัวอย่างแทน
  counsellorId.p = existingCounsellor?._id || counsellorId.c2;

  const employerDocs = await User.insertMany(
    EMPLOYERS.map((e, i) => ({
      ...baseAccount, name: e.name, email: emailFor(e.key), role: "employer", companyName: e.companyName, businessType: e.businessType,
      companySize: e.companySize, website: e.website, contactPosition: e.contactPosition, companyDescription: e.companyDescription,
      taxId: `9999999999${pad(i + 1)}1`, phone: `080-100-${pad(i + 1)}00`, province: "ขอนแก่น", verifiedStatus: e.verifiedStatus, createdAt: atPast(keyAgo(90 - i * 5)),
    }))
  );
  const employerId = Object.fromEntries(EMPLOYERS.map((e, i) => [e.key, employerDocs[i]._id]));

  const patientDocs = await User.insertMany(
    PATIENTS.map((p, i) => ({
      ...baseAccount, name: p.name, nickname: p.nickname, email: emailFor(p.key), role: "user", gender: p.gender, age: p.age, province: p.province,
      education: p.education, experience: p.experience, phone: `080-000-${pad(i + 1)}00`, assignedCounsellor: counsellorId[p.owner],
      bio: "กำลังตั้งใจฟื้นฟูตัวเองและมองหางานที่มั่นคง",
      avatarStyle: i % 2 === 0 ? "initial" : "image", avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
      familySharing: p.key === "p03" ? { progress: true, missions: false } : { progress: true, missions: true },
      createdAt: atPast(keyAgo(randInt(makeRng(i + 3), 60, 140))),
    }))
  );
  const patientId = Object.fromEntries(PATIENTS.map((p, i) => [p.key, patientDocs[i]._id]));

  const familyDocs = await User.insertMany(
    FAMILY_ACCOUNTS.map((f, i) => ({ ...baseAccount, name: f.name, email: emailFor(f.key), role: "family", phone: `080-200-${pad(i + 1)}00`, createdAt: atPast(keyAgo(70 - i * 3)) }))
  );
  const familyId = Object.fromEntries(FAMILY_ACCOUNTS.map((f, i) => [f.key, familyDocs[i]._id]));
  bump("บัญชีผู้ใช้", counsellorDocs.length + employerDocs.length + patientDocs.length + familyDocs.length);

  // --- 2) ทักษะของผู้ใช้ -----------------------------------------------------
  await ensureDefaultSkills();
  const allSkillNames = Object.values(DEFAULT_SKILLS).flat();
  const skillByName = new Map();
  for (const skill of await Skill.find({ skillName: { $in: allSkillNames } }).sort({ createdAt: 1 })) {
    if (!skillByName.has(skill.skillName)) skillByName.set(skill.skillName, skill);
  }
  const userSkillNames = new Map(); // key ผู้ป่วย -> ชื่อทักษะ (ใช้จับคู่งาน)
  const userSkillDocs = [];
  PATIENTS.forEach((patient, i) => {
    const rng = makeRng(500 + i);
    // ทักษะของผู้ป่วยอิงงานจริงในสายของตัวเอง: มีครบทุกทักษะของงาน 1-2 ตำแหน่ง (ตรง 100%) บวกทักษะเสริมบางส่วน
    // เพื่อให้เปอร์เซ็นต์ความตรงในหน้าค้นหางานกระจายตั้งแต่สูงไปต่ำ ไม่ใช่ต่ำเท่ากันหมด
    const clusterSkills = new Set(DEFAULT_SKILLS[patient.cluster]);
    const relatedJobs = JOBS.filter((job) => ["open", "closed", "expired"].includes(job.state) && job.skills.some((name) => clusterSkills.has(name)));
    const anchorJobs = sample(rng, relatedJobs, randInt(rng, 1, 2));
    const names = [...new Set([
      ...anchorJobs.flatMap((job) => job.skills),
      ...sample(rng, DEFAULT_SKILLS[patient.cluster], randInt(rng, 0, 1)),
      ...sample(rng, DEFAULT_SKILLS["soft-skill"], randInt(rng, 0, 1)),
    ])];
    userSkillNames.set(patient.key, names);
    for (const name of names) {
      userSkillDocs.push({ user: patientId[patient.key], skill: skillByName.get(name)._id, level: weighted(rng, [[1, 1], [2, 2], [3, 4], [4, 3], [5, 1]]) });
    }
  });
  await UserSkill.insertMany(userSkillDocs);
  bump("ทักษะของผู้ใช้", userSkillDocs.length);

  // --- 3) บันทึกอารมณ์ / ความเสี่ยง / แบบประเมินรายสัปดาห์ / เหตุการณ์เสี่ยง -----
  const logsByPatient = new Map();
  const emotionDocs = [];
  const riskDocs = [];
  const loginDocs = [];
  const loginSeen = new Set();
  const addLogin = (userId, dateKey) => {
    const id = `${userId}|${dateKey}`;
    if (loginSeen.has(id)) return;
    loginSeen.add(id);
    loginDocs.push({ user: userId, dateKey, createdAt: atPast(dateKey, 9), updatedAt: atPast(dateKey, 9) });
  };

  for (const [i, patient] of PATIENTS.entries()) {
    const userId = patientId[patient.key];
    const logs = await buildEmotionLogs(patient, i);
    logsByPatient.set(patient.key, logs);
    for (const log of logs) {
      emotionDocs.push({ user: userId, ...log, createdAt: log.date, updatedAt: log.date });
      if (log.dateKey >= keyAgo(30)) addLogin(userId, log.dateKey);
    }
    riskDocs.push(...(await buildRiskAssessments(userId, logs)));
  }
  await EmotionLog.insertMany(emotionDocs, { ordered: false });
  await RiskAssessment.insertMany(riskDocs, { ordered: false });
  bump("บันทึกอารมณ์รายวัน", emotionDocs.length);
  bump("ผลประเมินความเสี่ยง", riskDocs.length);

  // แบบประเมินรายสัปดาห์ (ความเครียด แนวโน้มอารมณ์ และสัญญาณเสี่ยงทำร้ายตนเอง)
  const weeklyDocs = [];
  PATIENTS.forEach((patient, i) => {
    const rng = makeRng(900 + i);
    const baseStress = { high: 4.4, medium: 3.4, low: 1.7 }[patient.risk];
    const weeks = randInt(rng, 4, 8);
    const firstWeek = patient.streak === 0 ? 1 : 0; // คนที่หายไปแล้วยังไม่ได้ส่งสัปดาห์นี้
    for (let k = firstWeek; k < weeks; k += 1) {
      const dateKey = keyAgo(k * 7);
      const createdAt = atPast(dateKey, 18);
      const flagged = patient.selfHarmWeeks?.includes(k) || false;
      weeklyDocs.push({
        user: patientId[patient.key],
        isoWeekKey: toIsoWeekKey(atTime(dateKey, 12)),
        stressLevel: clamp(Math.round(baseStress - TREND_SIGN[patient.trend] * 0.35 * k + (rng() - 0.5) * 1.2), 1, 5),
        moodTrend: k <= 1 ? { worsening: "worsening", improving: "improving", steady: "stable" }[patient.trend] : weighted(rng, [["stable", 5], ["improving", 2], ["worsening", 2]]),
        selfHarmRiskFlag: flagged,
        riskAlertedAt: flagged ? createdAt : undefined,
        notes: chance(rng, 0.45) ? pick(rng, WEEKLY_NOTES[patient.risk]) : undefined,
        createdAt, updatedAt: createdAt,
      });
    }
  });
  await WeeklyCheckIn.insertMany(weeklyDocs, { ordered: false });
  bump("แบบประเมินรายสัปดาห์", weeklyDocs.length);

  // เหตุการณ์เสี่ยงในชีวิตจริงที่ผู้ใช้บันทึกเอง ผลลัพธ์สัมพันธ์กับระดับความเสี่ยง
  const situationDocs = [];
  PATIENTS.forEach((patient, i) => {
    const rng = makeRng(1300 + i);
    if (!chance(rng, patient.risk === "low" ? 0.55 : 0.9)) return;
    const preferred = {
      high: ["relapsed", "partially_handled", "handled_well"],
      medium: ["partially_handled", "handled_well", "relapsed"],
      low: ["handled_well", "handled_well", "partially_handled"],
    }[patient.risk];
    for (const situation of sample(rng, RISK_SITUATIONS, randInt(rng, 1, patient.risk === "low" ? 3 : 4))) {
      const outcome = chance(rng, 0.6) ? situation.outcome : pick(rng, preferred);
      const occurredAt = atPast(keyAgo(randInt(rng, 1, 40)), randInt(rng, 8, 22));
      situationDocs.push({ user: patientId[patient.key], ...situation, outcome, occurredAt, createdAt: occurredAt, updatedAt: occurredAt });
    }
  });
  await RiskSituationLog.insertMany(situationDocs, { ordered: false });
  bump("เหตุการณ์เสี่ยง", situationDocs.length);

  // ประวัติการบำบัด และเป้าหมายส่วนตัว
  const rehabDocs = [];
  const goalDocs = [];
  PATIENTS.forEach((patient, i) => {
    const rng = makeRng(1700 + i);
    const ongoing = patient.risk === "high" && chance(rng, 0.5);
    const start = keyAgo(randInt(rng, ongoing ? 30 : 200, ongoing ? 90 : 520));
    rehabDocs.push({
      user: patientId[patient.key], hospitalName: pick(rng, REHAB_PLACES), status: ongoing ? "ongoing" : "completed",
      startDate: atTime(start), endDate: ongoing ? undefined : atTime(shiftDateKey(start, randInt(rng, 90, 150))),
    });
    for (const [term, titles] of Object.entries(GOALS)) {
      for (const title of sample(rng, titles, term === "short" ? randInt(rng, 1, 2) : 1)) {
        const status = weighted(rng, [["active", 6], ["completed", 3], ["abandoned", 1]]);
        goalDocs.push({
          user: patientId[patient.key], title, term, status, progress: status === "completed" ? 100 : randInt(rng, 5, 90),
          targetDate: atTime(shiftDateKey(TODAY, randInt(rng, term === "short" ? 7 : 60, term === "short" ? 40 : 240))),
          completedAt: status === "completed" ? atPast(keyAgo(randInt(rng, 1, 25))) : undefined,
        });
      }
    }
  });
  await RehabilitationRecord.insertMany(rehabDocs);
  await Goal.insertMany(goalDocs);
  bump("ประวัติการบำบัด", rehabDocs.length);
  bump("เป้าหมายส่วนตัว", goalDocs.length);

  // --- 4) งาน / ใบสมัคร / งานที่บันทึกไว้ ------------------------------------
  const categoryNames = [...new Set([...NEW_JOB_CATEGORIES, ...JOBS.map((job) => job.category)])];
  for (const name of categoryNames) await JobCategory.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
  const categoryByName = new Map((await JobCategory.find({ name: { $in: categoryNames } })).map((c) => [c.name, c._id]));
  const reviewer = admins[0]?._id;

  const jobRng = makeRng(2100);
  const jobDocs = await Job.insertMany(
    JOBS.map((job) => {
      const createdAt = atPast(keyAgo(randInt(jobRng, 3, 45)), 10);
      const reviewedAt = new Date(createdAt.getTime() + 6 * 3600 * 1000);
      const verified = ["open", "closed", "expired"].includes(job.state);
      return {
        title: job.title, description: job.description, employer: employerId[job.employer], location: job.location, salary: job.salary,
        // ไม่ใส่ลิงก์ประกาศต้นฉบับ เพราะบริษัทตัวอย่างไม่มีหน้าประกาศจริงให้ไปถึง (ดูหมายเหตุที่ JOBS ใน demoCatalog.js)
        externalUrl: job.externalUrl, category: categoryByName.get(job.category),
        attachmentRequests: job.attachments || [], createdAt, updatedAt: createdAt,
        status: job.state === "closed" ? "closed" : job.state === "expired" ? "expired" : "open",
        verifiedStatus: verified ? "verified" : job.state === "rejected" ? "rejected" : "pending",
        rejectionReason: job.state === "rejected" ? job.rejectionReason : undefined,
        reviewedBy: verified || job.state === "rejected" ? reviewer : undefined,
        reviewedAt: verified || job.state === "rejected" ? reviewedAt : undefined,
        expiredAt: job.state === "expired" ? atPast(keyAgo(randInt(jobRng, 5, 20)), 23, 59) : job.state === "open" ? atTime(shiftDateKey(TODAY, randInt(jobRng, 14, 75)), 23, 59) : undefined,
      };
    })
  );
  const jobSkillDocs = JOBS.flatMap((job, i) => job.skills.map((name) => ({ job: jobDocs[i]._id, skill: skillByName.get(name)._id })));
  await JobSkill.insertMany(jobSkillDocs);
  bump("ประกาศงาน", jobDocs.length);

  // ใบสมัคร: เลือกงานที่ทักษะตรงกับผู้ใช้ก่อน เพื่อให้เห็นเปอร์เซ็นต์ความตรงกันของทักษะ
  const applicableJobs = JOBS.map((job, i) => ({ ...job, id: jobDocs[i]._id, createdAt: jobDocs[i].createdAt })).filter((job) => ["open", "closed", "expired"].includes(job.state));
  const applicationDocs = [];
  const savedJobDocs = [];
  const applicationMeta = []; // ใช้สร้างการแจ้งเตือนต่อ
  PATIENTS.forEach((patient, i) => {
    const rng = makeRng(2500 + i);
    // ทุกคนมีใบสมัครอย่างน้อย 1 รายการ เพื่อให้เปิดหน้า "ใบสมัครของฉัน" สาธิตได้ไม่ว่าจะล็อกอินด้วยบัญชีไหน
    const count = { low: randInt(rng, 2, 4), medium: randInt(rng, 1, 3), high: randInt(rng, 1, 2) }[patient.risk];
    const mine = new Set(userSkillNames.get(patient.key));
    const ranked = applicableJobs
      .map((job) => ({ job, score: job.skills.filter((name) => mine.has(name)).length * 10 + rng() * 7 }))
      .sort((a, b) => b.score - a.score);
    const chosen = ranked.slice(0, count).map((entry) => entry.job);
    for (const job of chosen) {
      const isOpen = job.state === "open";
      const status = weighted(rng, isOpen
        ? [["pending", 30], ["interview", 25], ["passed", 14], ["rejected", 22], ["cancelled", 9]]
        : [["passed", 35], ["rejected", 45], ["cancelled", 20]]);
      const appliedAt = atPast(keyAgo(randInt(rng, 1, 35)), randInt(rng, 8, 20));
      applicationDocs.push({
        user: patientId[patient.key], job: job.id, status, appliedAt, createdAt: appliedAt, updatedAt: appliedAt,
        rejectionReason: status === "rejected" ? pick(rng, REJECTION_REASONS) : undefined,
        employerFeedback: status === "interview" || status === "passed" ? pick(rng, EMPLOYER_FEEDBACKS.slice(1)) : status === "rejected" && chance(rng, 0.6) ? EMPLOYER_FEEDBACKS[0] : undefined,
      });
      applicationMeta.push({ patient, job, status, appliedAt });
    }
    const appliedIds = new Set(chosen.map((job) => String(job.id)));
    for (const job of sample(rng, applicableJobs.filter((j) => j.state === "open" && !appliedIds.has(String(j.id))), randInt(rng, 1, 3))) {
      savedJobDocs.push({ user: patientId[patient.key], job: job.id });
    }
  });
  await Application.insertMany(applicationDocs, { ordered: false });
  await SavedJob.insertMany(savedJobDocs, { ordered: false });
  bump("ใบสมัครงาน", applicationDocs.length);
  bump("งานที่บันทึกไว้", savedJobDocs.length);

  // --- 5) คอร์สเรียน ----------------------------------------------------------
  const courseDocs = await Course.insertMany(
    COURSES.map((course, i) => ({
      title: course.title, description: course.description, category: course.category, tags: course.tags, externalUrl: course.url, coverImage: course.cover,
      // วันเปิด/วันสิ้นสุดเป็นวันที่จริงตามที่เว็บของคอร์สแจ้ง ("YYYY-MM-DD") ไม่มี = เว็บไม่กำหนด
      startDate: course.startDate ? bangkokStartOfDay(course.startDate) : undefined,
      endDate: course.endDate ? bangkokEndOfDay(course.endDate) : undefined,
      // ให้วันที่สร้างรายการไม่เกิดหลังวันเปิด (คอร์สที่จบไปแล้วก็ถูกสร้างก่อนวันสิ้นสุด)
      createdBy: counsellorId.c2,
      createdAt: atPast(course.startDate || (course.endDate && course.endDate < TODAY ? shiftDateKey(course.endDate, -60) : keyAgo(90 - i * 4))),
    }))
  );
  // คอร์สที่เปิดให้ลงทะเบียนอยู่ตอนนี้ (รวมคอร์สเดิมในระบบด้วย) ใช้เป็นตัวเลือกให้ผู้ใช้ลงทะเบียน
  const enrollableCourses = (await Course.find()).filter((course) => isWithinWindow(course));
  const userCourseDocs = [];
  PATIENTS.forEach((patient, i) => {
    const rng = makeRng(3100 + i);
    const count = { low: randInt(rng, 2, 4), medium: randInt(rng, 1, 3), high: randInt(rng, 0, 2) }[patient.risk];
    for (const course of sample(rng, enrollableCourses, count)) {
      const enrolledAt = atPast(keyAgo(randInt(rng, 1, 30)), 14);
      userCourseDocs.push({ user: patientId[patient.key], course: course._id, enrolledAt, createdAt: enrolledAt, updatedAt: enrolledAt });
    }
  });
  // ประวัติการเรียนคอร์สที่จบรุ่นไปแล้ว: ลงทะเบียนไว้ระหว่างที่คอร์สยังเปิด (ก่อนวันสิ้นสุดอย่างน้อย 5 วัน)
  courseDocs.forEach((course, i) => {
    if (!course.endDate || course.endDate >= NOW) return;
    const rng = makeRng(3300 + i);
    const endKey = toBangkokDateKey(course.endDate);
    const firstKey = course.startDate ? toBangkokDateKey(course.startDate) : shiftDateKey(endKey, -60);
    const span = Math.max(1, Math.round((bangkokStartOfDay(endKey) - bangkokStartOfDay(firstKey)) / 86400000) - 5);
    const learners = PATIENTS.filter((patient) => patient.risk !== "high");
    for (const patient of sample(rng, learners, randInt(rng, 2, 5))) {
      const enrolledAt = atPast(shiftDateKey(firstKey, randInt(rng, 0, span)), 14);
      userCourseDocs.push({ user: patientId[patient.key], course: course._id, enrolledAt, createdAt: enrolledAt, updatedAt: enrolledAt });
    }
  });
  await UserCourse.insertMany(userCourseDocs, { ordered: false });
  bump("คอร์สเรียนใหม่", courseDocs.length);
  bump("การลงทะเบียนคอร์ส", userCourseDocs.length);

  // --- 6) บทเรียน สถานการณ์จำลอง และผลการทำ ----------------------------------
  const lessons = await MicroLesson.find({ active: true, audience: "user" });
  const scenarios = await ScenarioSimulation.find({ active: true });
  const savedLessonDocs = [];
  const attemptDocs = [];
  PATIENTS.forEach((patient, i) => {
    const rng = makeRng(3700 + i);
    for (const lesson of sample(rng, lessons, randInt(rng, 0, 4))) savedLessonDocs.push({ user: patientId[patient.key], lesson: lesson._id });
    const attempts = { low: randInt(rng, 3, 6), medium: randInt(rng, 1, 4), high: randInt(rng, 0, 3) }[patient.risk];
    const passRate = { low: 0.85, medium: 0.65, high: 0.45 }[patient.risk];
    const order = sample(rng, scenarios, scenarios.length); // สับลำดับครั้งเดียว เพื่อให้ทำโจทย์ที่ต่างกันก่อนจะทำซ้ำ
    for (let n = 0; n < attempts && scenarios.length; n += 1) {
      const scenario = n < order.length ? order[n] : pick(rng, scenarios);
      const correctIndex = scenario.options.findIndex((option) => option.isCorrect);
      const passed = chance(rng, passRate);
      const wrongChoices = scenario.options.map((_, idx) => idx).filter((idx) => idx !== correctIndex);
      const attemptedAt = atPast(keyAgo(randInt(rng, 0, 28)), randInt(rng, 8, 21));
      attemptDocs.push({
        user: patientId[patient.key], scenario: scenario._id, passed, attemptedAt, createdAt: attemptedAt, updatedAt: attemptedAt,
        chosenOptionIndex: passed || !wrongChoices.length ? correctIndex : pick(rng, wrongChoices),
      });
    }
  });
  await SavedLesson.insertMany(savedLessonDocs, { ordered: false });
  await ScenarioAttempt.insertMany(attemptDocs, { ordered: false });
  bump("บทเรียนที่บันทึกไว้", savedLessonDocs.length);
  bump("ผลทำสถานการณ์จำลอง", attemptDocs.length);

  // --- 7) ภารกิจกิจกรรมประจำวัน และเกม ----------------------------------------
  const newMissionDocs = await ActivityMission.insertMany(NEW_ACTIVITY_MISSIONS.map((m) => ({ ...m, active: true, createdBy: counsellorId.c2, createdAt: atPast(keyAgo(40)) })));
  bump("ภารกิจกิจกรรมใหม่", newMissionDocs.length);
  const activeMissions = await ActivityMission.find({ active: true });
  const activityLogDocs = [];
  const gameDocs = [];
  PATIENTS.forEach((patient, i) => {
    const rng = makeRng(4300 + i);
    const userId = patientId[patient.key];
    const activeRate = { low: 0.55, medium: 0.32, high: 0.14 }[patient.risk];
    const seen = new Set();
    for (let d = 0; d < 21; d += 1) {
      if (!chance(rng, activeRate)) continue;
      const dateKey = keyAgo(d);
      for (const mission of sample(rng, activeMissions, randInt(rng, 1, 2))) {
        const uniqueKey = `${mission._id}|${dateKey}`;
        if (seen.has(uniqueKey)) continue;
        seen.add(uniqueKey);
        const createdAt = atPast(dateKey, randInt(rng, 9, 20));
        const log = {
          user: userId, activityMission: mission._id, category: mission.category, dateKey, pointsAwarded: mission.points,
          requiresApproval: Boolean(mission.requiresApproval), createdAt, updatedAt: createdAt,
        };
        if (mission.category === "physical") {
          log.durationMinutes = randInt(rng, 15, 60);
          log.fatigueLevel = randInt(rng, 1, 5);
          log.enjoymentLevel = randInt(rng, 2, 5);
          if (/เดิน|วิ่ง|ปั่น/.test(mission.title)) log.distanceKm = Math.round((1 + rng() * 7) * 10) / 10;
        }
        if (log.requiresApproval) {
          if (d < 4) log.approved = null; // ยังรอผู้ให้คำปรึกษาตรวจสอบ
          else if (chance(rng, 0.85)) Object.assign(log, { approved: true, approvedBy: counsellorId[patient.owner], approvedAt: atPast(shiftDateKey(dateKey, 1), 10) });
          else Object.assign(log, { approved: false, approvedBy: counsellorId[patient.owner], approvedAt: atPast(shiftDateKey(dateKey, 1), 10), reviewNote: "ไม่พบหลักฐานการเข้าร่วมกิจกรรม กรุณาบันทึกใหม่พร้อมรายละเอียด" });
        }
        activityLogDocs.push(log);
      }
    }

    // เกมประจำวัน (1 ครั้งต่อประเภทต่อวัน)
    const playRate = { low: 0.6, medium: 0.38, high: 0.2 }[patient.risk];
    for (let d = 0; d < 14; d += 1) {
      if (!chance(rng, playRate)) continue;
      const dateKey = keyAgo(d);
      const createdAt = atPast(dateKey, randInt(rng, 9, 21));
      for (const gameType of sample(rng, ["wheel", "memory", "quiz", "breathing", "emotion"], randInt(rng, 1, 2))) {
        let play;
        if (gameType === "wheel") {
          const segment = pick(rng, WHEEL_SEGMENTS);
          play = { domain: segment.domain, pointsAwarded: segment.points, resultLabel: segment.label };
        } else if (gameType === "memory") {
          const moves = randInt(rng, 10, 26);
          play = { domain: "coping", pointsAwarded: moves <= 14 ? 10 : moves <= 20 ? 7 : 5, resultLabel: `${moves} ครั้ง` };
        } else if (gameType === "quiz") {
          const correct = randInt(rng, patient.risk === "high" ? 0 : 1, 3);
          play = { domain: "learning", pointsAwarded: correct, resultLabel: `${correct}/3 ข้อ` };
        } else if (gameType === "breathing") {
          const rounds = randInt(rng, 3, 8);
          play = { domain: "mindfulness", pointsAwarded: Math.min(rounds, 6), resultLabel: `${rounds} รอบ` };
        } else {
          const correct = randInt(rng, 1, 5);
          play = { domain: "self_awareness", pointsAwarded: correct, resultLabel: `${correct}/5 ข้อ` };
        }
        gameDocs.push({ user: userId, gameType, dateKey, ...play, createdAt, updatedAt: createdAt });
      }
    }
  });
  await ActivityMissionLog.insertMany(activityLogDocs, { ordered: false });
  await GamePlay.insertMany(gameDocs, { ordered: false });
  bump("บันทึกภารกิจกิจกรรม", activityLogDocs.length);
  bump("บันทึกการเล่นเกม", gameDocs.length);

  // --- 8) นัดปรึกษา -----------------------------------------------------------
  const sessionDocs = [];
  PATIENTS.forEach((patient, i) => {
    const rng = makeRng(4900 + i);
    patient.sessions.forEach((kind, n) => {
      const topic = pick(rng, SESSION_TOPICS);
      const owner = counsellorId[patient.owner];
      const userId = patientId[patient.key];
      const doc = { user: userId, counsellor: owner, sessionType: topic.type, topic: topic.topic, message: topic.message, mood: topic.mood, status: kind, messages: [] };
      let createdAt;
      if (kind === "pending") {
        createdAt = atPast(TODAY, 8 + n);
        Object.assign(doc, { counsellor: null, preferredAt: atTime(shiftDateKey(TODAY, 1), 10) });
      } else if (kind === "active") {
        createdAt = atPast(TODAY, 7);
        Object.assign(doc, { sessionType: "chat", preferredAt: createdAt, scheduledAt: atPast(TODAY, 8) });
      } else if (kind === "scheduledToday") {
        createdAt = atPast(keyAgo(2), 15);
        const hour = randInt(rng, 13, 18);
        Object.assign(doc, { status: "scheduled", sessionType: "video", preferredAt: atTime(TODAY, hour), scheduledAt: atTime(TODAY, hour, pick(rng, [0, 30])) });
      } else if (kind === "scheduledFuture") {
        createdAt = atPast(keyAgo(1), 16);
        const when = atTime(shiftDateKey(TODAY, randInt(rng, 1, 6)), randInt(rng, 9, 16), pick(rng, [0, 30]));
        Object.assign(doc, { status: "scheduled", sessionType: "video", preferredAt: when, scheduledAt: when });
      } else {
        const daysBack = randInt(rng, 4, 40);
        createdAt = atPast(keyAgo(daysBack + 1), 11);
        const when = atPast(keyAgo(daysBack), 14);
        Object.assign(doc, { status: "closed", preferredAt: when, scheduledAt: topic.type === "video" ? when : undefined, outcome: { summary: pick(rng, OUTCOME_SUMMARIES), recordedAt: new Date(when.getTime() + 3600 * 1000), recordedBy: owner } });
      }
      if (doc.sessionType === "video" && doc.scheduledAt) {
        doc.meetingLink = n % 2 === 0 ? "https://meet.google.com/abc-defg-hij" : "https://zoom.us/j/99999999999";
        doc.meetingPlatform = detectMeetingPlatform(doc.meetingLink);
      }
      // บทสนทนาในห้องแชท สลับระหว่างผู้ให้คำปรึกษากับผู้ใช้
      if (kind !== "pending") {
        const turns = kind === "active" ? 4 : kind === "closed" ? 4 : 2;
        for (let t = 0; t < turns; t += 1) {
          const fromCounsellor = t % 2 === 0;
          const sentAt = new Date(createdAt.getTime() + (t + 1) * 6 * 60 * 1000);
          doc.messages.push({
            sender: fromCounsellor ? owner : userId, senderRole: fromCounsellor ? "counsellor" : "user",
            content: fromCounsellor ? COUNSELLOR_REPLIES[t % COUNSELLOR_REPLIES.length] : USER_REPLIES[t % USER_REPLIES.length],
            createdAt: sentAt, updatedAt: sentAt,
          });
        }
      }
      Object.assign(doc, { createdAt, updatedAt: createdAt });
      sessionDocs.push(doc);
    });
  });
  const insertedSessions = await CounsellingSession.insertMany(sessionDocs);
  bump("นัดปรึกษา", insertedSessions.length);

  // --- 9) ครอบครัว: การเชื่อมต่อ ข้อความ และภารกิจร่วมกัน ---------------------
  const linkDocs = [];
  for (const [i, family] of FAMILY_ACCOUNTS.entries()) {
    const createdAt = atPast(keyAgo(40 - i * 4), 10);
    linkDocs.push({
      recoveringUser: patientId[family.patient], familyUser: familyId[family.key], inviteEmail: emailFor(family.key), status: family.status,
      initiatedBy: family.status === "requested" ? "family" : "recovering",
      ...(family.status === "requested" ? {} : { inviteTokenHash: `demo-token-${family.key}`, inviteExpiresAt: atTime(shiftDateKey(keyAgo(40 - i * 4), 7)) }),
      createdAt, updatedAt: createdAt,
    });
  }
  for (const invite of PENDING_INVITES) {
    linkDocs.push({
      recoveringUser: patientId[invite.patient], inviteEmail: invite.email, status: "pending", initiatedBy: "recovering",
      inviteTokenHash: `demo-token-${invite.patient}`, inviteExpiresAt: atTime(shiftDateKey(TODAY, 5)), createdAt: atPast(keyAgo(2)), updatedAt: atPast(keyAgo(2)),
    });
  }
  const links = await FamilyLink.insertMany(linkDocs);
  const activeLinks = links.filter((link) => link.status === "active");

  const messageDocs = [];
  const missionLogDocs = [];
  const familyMissions = await FamilyMission.find({ active: true });
  activeLinks.forEach((link, i) => {
    const rng = makeRng(5500 + i);
    const count = randInt(rng, 4, 6);
    for (let m = 0; m < count; m += 1) {
      const fromFamily = m % 2 === 0;
      const sentAt = atPast(keyAgo(count - m), randInt(rng, 9, 20));
      messageDocs.push({
        familyLink: link._id, sender: fromFamily ? link.familyUser : link.recoveringUser, senderRole: fromFamily ? "family" : "user",
        content: fromFamily ? FAMILY_TO_USER[m % FAMILY_TO_USER.length] : USER_TO_FAMILY[m % USER_TO_FAMILY.length],
        readAt: m < count - 1 ? new Date(sentAt.getTime() + 3600 * 1000) : undefined, createdAt: sentAt, updatedAt: sentAt,
      });
    }
    const used = new Set();
    for (let n = 0; n < 5 && familyMissions.length; n += 1) {
      const mission = pick(rng, familyMissions);
      const dateKey = keyAgo(randInt(rng, 0, 9));
      if (used.has(`${mission._id}|${dateKey}`)) continue;
      used.add(`${mission._id}|${dateKey}`);
      const userConfirmed = chance(rng, 0.9);
      const familyConfirmed = chance(rng, 0.75);
      const completed = userConfirmed && familyConfirmed;
      const doneAt = atPast(dateKey, 19);
      missionLogDocs.push({
        familyLink: link._id, recoveringUser: link.recoveringUser, familyMission: mission._id, dateKey, userConfirmed, familyConfirmed, completed,
        userConfirmedAt: userConfirmed ? doneAt : undefined, familyConfirmedAt: familyConfirmed ? doneAt : undefined,
        completedAt: completed ? doneAt : undefined, pointsAwarded: completed ? mission.points : 0, createdAt: doneAt, updatedAt: doneAt,
      });
    }
  });
  await FamilyMessage.insertMany(messageDocs);
  await FamilyMissionLog.insertMany(missionLogDocs, { ordered: false });
  bump("การเชื่อมต่อครอบครัว", links.length);
  bump("ข้อความครอบครัว", messageDocs.length);
  bump("ภารกิจร่วมกับครอบครัว", missionLogDocs.length);

  // --- 10) ชุมชน: โพสต์ คอมเมนต์ ถูกใจ และโพสต์ที่ถูกรายงาน ---------------------
  const patientIds = Object.values(patientId);
  const postRng = makeRng(6100);
  const postDocs = [];
  for (const [i, post] of POSTS.entries()) {
    const createdAt = atPast(keyAgo(18 - i * 2), 11);
    const reports = (post.reports || []).map((report, r) => ({ reporter: patientIds[(i + r * 3) % patientIds.length], reason: report.reason, detail: report.detail, createdAt: atPast(keyAgo(1), 9 + r) }));
    const likedBy = reports.length ? [] : sample(postRng, patientIds, randInt(postRng, 3, 16));
    postDocs.push({
      user: counsellorId[post.author], content: post.content, tags: post.tags, commentsEnabled: true, visibleToRoles: post.audience || [],
      needsReview: reports.length > 0, reports, likedBy, likes: likedBy.length, createdAt, updatedAt: createdAt,
    });
  }
  const posts = await Post.insertMany(postDocs);
  const commentDocs = [];
  const savedPostDocs = [];
  posts.forEach((post, i) => {
    if (post.needsReview || post.visibleToRoles.length) return;
    const rng = makeRng(6300 + i);
    for (const commenter of sample(rng, patientIds, randInt(rng, 2, 5))) {
      const createdAt = new Date(post.createdAt.getTime() + randInt(rng, 1, 70) * 3600 * 1000);
      commentDocs.push({ post: post._id, user: commenter, content: pick(rng, COMMENT_TEXTS), createdAt: createdAt > NOW ? NOW : createdAt, updatedAt: createdAt > NOW ? NOW : createdAt });
    }
    for (const saver of sample(rng, patientIds, randInt(rng, 1, 4))) savedPostDocs.push({ user: saver, post: post._id });
  });
  await Comment.insertMany(commentDocs);
  await SavedPost.insertMany(savedPostDocs, { ordered: false });
  bump("โพสต์ชุมชน", posts.length);
  bump("คอมเมนต์", commentDocs.length);

  // --- 11) การแจ้งเตือน และประวัติการเข้าสู่ระบบ --------------------------------
  const notificationDocs = [];
  const notify = (user, message, type, createdAt, extra = {}) =>
    notificationDocs.push({ user, message, type, status: createdAt < atPast(keyAgo(2)) ? "read" : "unread", createdAt, updatedAt: createdAt, ...extra });
  const careTeam = (patient) => [...new Set([...admins.map((a) => String(a._id)), String(counsellorId[patient.owner])])];

  for (const patient of PATIENTS) {
    const userId = patientId[patient.key];
    const logs = logsByPatient.get(patient.key);
    if (patient.risk === "high") {
      for (const recipient of careTeam(patient)) {
        notify(recipient, `แจ้งเตือนความเสี่ยง: ระบบประเมินว่า ${patient.name} มีความเสี่ยงสูงจากข้อมูลอารมณ์/ความอยากล่าสุด`, "riskAlert", new Date(logs[0].date.getTime() + 2 * 60 * 1000), { link: `/counsellor/patients/${userId}` });
      }
    }
    if (patient.selfHarmWeeks?.length) {
      for (const recipient of careTeam(patient)) {
        notify(recipient, `แจ้งเตือนความเสี่ยง: ${patient.name} ระบุสัญญาณเสี่ยงในแบบประเมินรายสัปดาห์ ควรติดตามโดยด่วน`, "riskAlert", atPast(keyAgo(patient.selfHarmWeeks[0] * 7), 18), { link: `/counsellor/patients/${userId}` });
      }
    }
    if (patient.streak === 0) notify(userId, "วันนี้ยังไม่ได้เช็คอินอารมณ์ ใช้เวลาเพียงไม่กี่วินาที มาบันทึกกันนะ", "reminder", atPast(TODAY, 8));
  }
  for (const meta of applicationMeta) {
    const label = { pending: "รอการพิจารณา", interview: "นัดสัมภาษณ์", passed: "ผ่านการคัดเลือก", rejected: "ไม่ผ่านการคัดเลือก", cancelled: "ยกเลิกแล้ว" }[meta.status];
    const employerKey = meta.job.employer;
    notify(employerId[employerKey], `มีผู้สมัครใหม่ตำแหน่ง "${meta.job.title}"`, "job", meta.appliedAt, { link: "/employer/applications" });
    if (meta.status !== "pending" && meta.status !== "cancelled") {
      notify(patientId[meta.patient.key], `สถานะใบสมัครตำแหน่ง "${meta.job.title}" อัปเดตเป็น "${label}"`, "job", new Date(Math.min(meta.appliedAt.getTime() + 2 * 86400000, NOW.getTime() - 60000)), { link: "/my-applications" });
    }
  }
  for (const session of insertedSessions) {
    if (session.status === "scheduled") notify(session.user, `นัดปรึกษาของคุณถูกยืนยันแล้ว: ${session.topic}`, "counselling", session.createdAt, { link: `/counselling/${session._id}` });
    if (session.status === "pending") {
      for (const recipient of [counsellorId.p, counsellorId.c2, counsellorId.c3]) notify(recipient, `มีคำขอปรึกษาใหม่: ${session.topic}`, "counselling", session.createdAt, { link: `/counsellor/requests/${session._id}` });
    }
  }
  for (const course of courseDocs) {
    if (!course.endDate || course.endDate < NOW) continue;
    const daysLeft = Math.ceil((course.endDate - NOW) / 86400000);
    if (daysLeft > 7) continue;
    for (const enrol of userCourseDocs.filter((u) => String(u.course) === String(course._id))) {
      notify(enrol.user, `คอร์ส "${course.title}" จะสิ้นสุดใน ${daysLeft} วัน อย่าลืมเรียนให้จบ`, "courseExpiry", atPast(TODAY, 8), { link: `/courses/${course._id}` });
    }
  }
  await Notification.insertMany(notificationDocs);
  bump("การแจ้งเตือน", notificationDocs.length);

  // การเข้าสู่ระบบของนายจ้าง ผู้ให้คำปรึกษา และครอบครัว (ใช้แสดงกราฟผู้ใช้งานล่าสุดบนแดชบอร์ด)
  const loginRng = makeRng(7100);
  // เฉพาะบัญชีตัวอย่างเท่านั้น (ไม่สร้างประวัติให้บัญชีจริงที่ลบทีหลังไม่ได้)
  for (const userId of [...counsellorDocs.map((c) => c._id), ...Object.values(employerId), ...Object.values(familyId)]) {
    for (let d = 0; d < 14; d += 1) if (chance(loginRng, 0.6)) addLogin(userId, keyAgo(d));
  }
  await LoginEvent.insertMany(loginDocs, { ordered: false });
  bump("ประวัติการเข้าสู่ระบบ", loginDocs.length);

  // --- 12) คำนวณภารกิจและรางวัลด้วยตรรกะจริงของระบบ ----------------------------
  for (const patient of PATIENTS) await checkAndAwardMissions(patientId[patient.key]);
  const ids = Object.values(patientId);
  bump("ภารกิจที่สำเร็จ", await UserMission.countDocuments({ user: { $in: ids }, completed: true }));
  bump("รางวัลที่ได้รับ", await UserReward.countDocuments({ user: { $in: ids } }));

  return { stats, logsByPatient };
}

// ---------------------------------------------------------------------------
// ลบข้อมูลตัวอย่างทั้งหมด (เฉพาะที่เกี่ยวกับบัญชี @demo.glowup.example)
// ---------------------------------------------------------------------------

async function clean() {
  const users = await User.find({ email: DEMO_EMAIL_PATTERN }).setOptions({ withDeleted: true }).select("_id");
  const userIds = users.map((u) => u._id);
  if (!userIds.length) return { users: 0 };

  const [sessions, jobs, courses, posts, actMissions] = await Promise.all([
    CounsellingSession.find({ $or: [{ user: { $in: userIds } }, { counsellor: { $in: userIds } }] }).select("_id"),
    Job.find({ employer: { $in: userIds } }).select("_id"),
    Course.find({ createdBy: { $in: userIds } }).select("_id"),
    Post.find({ user: { $in: userIds } }).select("_id"),
    ActivityMission.find({ createdBy: { $in: userIds } }).select("_id"),
  ]);
  const links = await FamilyLink.find({ $or: [{ recoveringUser: { $in: userIds } }, { familyUser: { $in: userIds } }] }).select("_id");
  const sessionIds = sessions.map((s) => s._id);
  const jobIds = jobs.map((j) => j._id);
  const courseIds = courses.map((c) => c._id);
  const postIds = posts.map((p) => p._id);
  const missionIds = actMissions.map((m) => m._id);
  const linkIds = links.map((l) => l._id);
  const mine = { $in: userIds };

  // การแจ้งเตือนที่ส่งถึงบัญชีจริง (แอดมิน/ผู้ให้คำปรึกษาเดิม) แต่ลิงก์ชี้ไปยังข้อมูลตัวอย่าง
  const demoTargets = [...userIds, ...sessionIds].map(String);
  const linkPattern = new RegExp(`^/counsellor/(patients|requests)/(${demoTargets.join("|")})$`);

  const removed = {
    notifications: (await Notification.deleteMany({ $or: [{ user: mine }, { link: linkPattern }] })).deletedCount,
    loginEvents: (await LoginEvent.deleteMany({ user: mine })).deletedCount,
    emotionLogs: (await EmotionLog.deleteMany({ user: mine })).deletedCount,
    riskAssessments: (await RiskAssessment.deleteMany({ user: mine })).deletedCount,
    weeklyCheckIns: (await WeeklyCheckIn.deleteMany({ user: mine })).deletedCount,
    riskSituations: (await RiskSituationLog.deleteMany({ user: mine })).deletedCount,
    rehabRecords: (await RehabilitationRecord.deleteMany({ user: mine })).deletedCount,
    goals: (await Goal.deleteMany({ user: mine })).deletedCount,
    userSkills: (await UserSkill.deleteMany({ user: mine })).deletedCount,
    applications: (await Application.deleteMany({ $or: [{ user: mine }, { job: { $in: jobIds } }] })).deletedCount,
    savedJobs: (await SavedJob.deleteMany({ $or: [{ user: mine }, { job: { $in: jobIds } }] })).deletedCount,
    jobSkills: (await JobSkill.deleteMany({ job: { $in: jobIds } })).deletedCount,
    jobs: (await Job.deleteMany({ _id: { $in: jobIds } })).deletedCount,
    userCourses: (await UserCourse.deleteMany({ $or: [{ user: mine }, { course: { $in: courseIds } }] })).deletedCount,
    courses: (await Course.deleteMany({ _id: { $in: courseIds } })).deletedCount,
    savedLessons: (await SavedLesson.deleteMany({ user: mine })).deletedCount,
    scenarioAttempts: (await ScenarioAttempt.deleteMany({ user: mine })).deletedCount,
    activityLogs: (await ActivityMissionLog.deleteMany({ $or: [{ user: mine }, { activityMission: { $in: missionIds } }] })).deletedCount,
    activityMissions: (await ActivityMission.deleteMany({ _id: { $in: missionIds } })).deletedCount,
    gamePlays: (await GamePlay.deleteMany({ user: mine })).deletedCount,
    userMissions: (await UserMission.deleteMany({ user: mine })).deletedCount,
    userRewards: (await UserReward.deleteMany({ user: mine })).deletedCount,
    sessions: (await CounsellingSession.deleteMany({ _id: { $in: sessionIds } })).deletedCount,
    familyMessages: (await FamilyMessage.deleteMany({ familyLink: { $in: linkIds } })).deletedCount,
    familyMissionLogs: (await FamilyMissionLog.deleteMany({ $or: [{ familyLink: { $in: linkIds } }, { recoveringUser: mine }] })).deletedCount,
    familyLinks: (await FamilyLink.deleteMany({ _id: { $in: linkIds } })).deletedCount,
    comments: (await Comment.deleteMany({ $or: [{ user: mine }, { post: { $in: postIds } }] })).deletedCount,
    savedPosts: (await SavedPost.deleteMany({ $or: [{ user: mine }, { post: { $in: postIds } }] })).deletedCount,
    posts: (await Post.deleteMany({ _id: { $in: postIds } })).deletedCount,
    users: (await User.deleteMany({ _id: { $in: userIds } }).setOptions({ withDeleted: true })).deletedCount,
  };
  return removed;
}

// ---------------------------------------------------------------------------

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("ไม่อนุญาตให้รันสคริปต์ข้อมูลตัวอย่างเมื่อ NODE_ENV=production");
    process.exit(1);
  }
  assertLocalDatabase();
  await connectDB();
  try {
    const args = process.argv.slice(2);
    if (args.includes("--clean")) {
      console.log("ลบข้อมูลตัวอย่างแล้ว:", await clean());
      return;
    }
    if (await User.exists({ email: DEMO_EMAIL_PATTERN })) {
      if (!args.includes("--reset")) {
        console.error("พบข้อมูลตัวอย่างอยู่แล้ว ใช้ --reset เพื่อลบแล้วสร้างใหม่ หรือ --clean เพื่อลบอย่างเดียว");
        process.exit(1);
      }
      console.log("ลบข้อมูลตัวอย่างเดิม:", await clean());
    }
    const { stats, logsByPatient } = await seed();

    console.log("\nสร้างข้อมูลตัวอย่างสำเร็จ:");
    for (const [name, count] of Object.entries(stats)) console.log(`  ${name.padEnd(24)} ${count}`);
    console.log("\nผู้ป่วยตัวอย่าง (อีเมล patientNN@" + DEMO_EMAIL_DOMAIN + ")");
    for (const patient of PATIENTS) {
      const logs = logsByPatient.get(patient.key);
      console.log(`  ${patient.key}  ${patient.name.padEnd(24)} ความเสี่ยง ${patient.risk.padEnd(7)} บันทึกอารมณ์ ${String(logs.length).padStart(3)} วัน`);
    }
    console.log(`\nรหัสผ่านของทุกบัญชีตัวอย่าง: ${DEMO_PASSWORD}`);
    console.log(`อีเมล: patient01..28 / employer1..6 / counsellor2..3 / family1..6 @${DEMO_EMAIL_DOMAIN}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
