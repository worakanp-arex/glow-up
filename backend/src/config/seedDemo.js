// Dev/demo helper: seeds sample *content* (lessons, scenarios, family missions,
// skills, community posts + comments) so the pages have something to show.
// Every document is tagged with DEMO_TAG so it can be removed precisely.
// Run with:   node src/config/seedDemo.js
// Remove with: node src/config/seedDemo.js --clean
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./db.js";
import User from "../models/User.js";
import MicroLesson from "../models/MicroLesson.js";
import ScenarioSimulation from "../models/ScenarioSimulation.js";
import ScenarioAttempt from "../models/ScenarioAttempt.js";
import SavedLesson from "../models/SavedLesson.js";
import FamilyMission from "../models/FamilyMission.js";
import FamilyMissionLog from "../models/FamilyMissionLog.js";
import Skill from "../models/Skill.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import SavedPost from "../models/SavedPost.js";

dotenv.config();

const DEMO_TAG = "[ตัวอย่าง]";
const tag = (text) => `${DEMO_TAG} ${text}`;
const startsWithTag = new RegExp(`^${DEMO_TAG.replace(/[[\]]/g, "\\$&")}`);

const LESSONS = [
  {
    title: "รู้จักตัวกระตุ้น: อะไรทำให้เราอยากกลับไปใช้",
    category: "self_awareness",
    audience: "user",
    order: 1,
    body: "ตัวกระตุ้นคือคน สถานที่ เวลา หรืออารมณ์ที่ทำให้ความอยากเพิ่มขึ้น เช่น ความเครียดจากงาน การเจอเพื่อนเก่า หรือช่วงเวลาเดิม ๆ ของวัน\n\nลองจดสัปดาห์ละครั้งว่าช่วงไหนที่รู้สึกอยากมากที่สุด และตอนนั้นเกิดอะไรขึ้น เมื่อเห็นรูปแบบ เราจะวางแผนรับมือล่วงหน้าได้ง่ายขึ้น",
  },
  {
    title: "ฝึกหายใจ 4-7-8 เมื่อความเครียดพุ่ง",
    category: "coping",
    audience: "user",
    order: 2,
    body: "เมื่อรู้สึกเครียดหรือใจสั่น ให้นั่งลงในที่ที่สบาย หายใจเข้าทางจมูกนับ 4 กลั้นไว้นับ 7 แล้วค่อย ๆ หายใจออกทางปากนับ 8 ทำซ้ำ 4 รอบ\n\nการหายใจช้า ๆ ช่วยให้ร่างกายผ่อนคลาย ใช้ได้ทุกที่ และเป็นก้าวเล็ก ๆ ที่ช่วยให้เรามีเวลาตัดสินใจอย่างใจเย็น",
  },
  {
    title: "สร้างกิจวัตรประจำวันให้มั่นคง",
    category: "routine",
    audience: "user",
    order: 3,
    body: "กิจวัตรที่สม่ำเสมอช่วยลดเวลาว่างที่ความคิดฟุ้งซ่านเข้ามา เริ่มจาก 3 อย่างง่าย ๆ ได้แก่ ตื่นและนอนเวลาเดิม กินอาหารให้ครบมื้อ และขยับตัวอย่างน้อย 15 นาทีต่อวัน\n\nไม่ต้องทำให้สมบูรณ์แบบ ขอแค่ทำต่อเนื่อง วันไหนพลาดไปก็เริ่มใหม่ได้ในวันถัดไป",
  },
  {
    title: "ฝึกปฏิเสธอย่างสุภาพแต่หนักแน่น",
    category: "social",
    audience: "user",
    order: 4,
    body: "การปฏิเสธไม่ได้แปลว่าไม่เกรงใจ ใช้ประโยคสั้น ชัดเจน ไม่ต้องอธิบายยาว เช่น \"ขอบคุณนะ แต่ตอนนี้ไม่สะดวก\" แล้วเปลี่ยนเรื่องหรือเดินออกจากสถานการณ์\n\nหากอีกฝ่ายยังคะยั้นคะยอ ให้ย้ำประโยคเดิมอย่างใจเย็น และบอกคนที่ไว้ใจทันทีหลังจากนั้น",
  },
  {
    title: "คู่มือครอบครัว: ฟังอย่างเข้าใจโดยไม่ตัดสิน",
    category: "family",
    audience: "family",
    order: 1,
    body: "การฟื้นฟูต้องใช้เวลา การถามว่า \"วันนี้เป็นอย่างไรบ้าง\" แล้วรับฟังโดยไม่ขัดหรือตำหนิ ช่วยให้เขารู้สึกปลอดภัยที่จะเล่าความจริง\n\nหลีกเลี่ยงการเปรียบเทียบกับผู้อื่นหรือขุดเรื่องในอดีต ชื่นชมความพยายามเล็ก ๆ ที่เห็น และดูแลตัวเองของผู้ดูแลด้วย",
  },
  {
    title: "คู่มือครอบครัว: สังเกตสัญญาณเตือนและขอความช่วยเหลือ",
    category: "family",
    audience: "family",
    order: 2,
    body: "สัญญาณที่ควรใส่ใจ ได้แก่ นอนผิดปกติ แยกตัว หงุดหงิดง่ายขึ้น หรือพูดถึงความรู้สึกสิ้นหวัง ให้ชวนคุยอย่างอ่อนโยนและเสนอความช่วยเหลือ\n\nหากกังวลเรื่องความปลอดภัย ให้ติดต่อผู้เชี่ยวชาญหรือสายด่วนสุขภาพจิต 1323 ทันที ไม่ต้องรอให้อาการหนักขึ้น",
  },
];

// `lesson` is matched to a LESSONS title; exactly one option is correct.
const SCENARIOS = [
  {
    title: "เพื่อนเก่าชวนไปงานเลี้ยง",
    lesson: LESSONS[3].title,
    prompt: "เพื่อนสนิทเก่าโทรมาชวนไปงานเลี้ยงคืนนี้ และบอกว่าจะมี \"ของ\" ให้ลองเหมือนเดิม คุณควรทำอย่างไร",
    options: [
      { text: "ไปแค่แป๊บเดียว ไม่ลองก็ได้", isCorrect: false, feedback: "การไปอยู่ในสถานที่เสี่ยงทำให้ความอยากพุ่งสูงและเลี่ยงยาก ควรหลีกเลี่ยงตั้งแต่ต้น" },
      { text: "ปฏิเสธสั้น ๆ ว่าไม่สะดวก แล้วโทรหาคนที่ไว้ใจ", isCorrect: true, feedback: "ถูกต้อง การปฏิเสธชัดเจนและมีคนสนับสนุนช่วยให้ผ่านช่วงเสี่ยงไปได้" },
      { text: "ไม่รับสาย เงียบหายไปเลย", isCorrect: false, feedback: "การหนีอย่างเดียวอาจทำให้ถูกตามตื๊อ ลองบอกอย่างสุภาพแต่ชัดเจนจะดีกว่า" },
    ],
  },
  {
    title: "ความเครียดหลังเลิกงานหนัก",
    lesson: LESSONS[1].title,
    prompt: "วันนี้งานหนักและถูกตำหนิ กลับถึงห้องแล้วรู้สึกอยากกลับไปใช้เพื่อให้ผ่อนคลาย คุณควรทำอย่างไรก่อน",
    options: [
      { text: "หายใจ 4-7-8 และออกไปเดินสั้น ๆ แล้วค่อยประเมินความรู้สึกอีกครั้ง", isCorrect: true, feedback: "ถูกต้อง ความอยากมักขึ้นสูงแล้วลดลงเองภายในไม่กี่นาที การให้เวลาและขยับตัวช่วยได้มาก" },
      { text: "นั่งคิดวนเรื่องที่ถูกตำหนิต่อไปคนเดียว", isCorrect: false, feedback: "การครุ่นคิดคนเดียวมักทำให้เครียดและอยากมากขึ้น" },
      { text: "คิดว่าครั้งเดียวคงไม่เป็นไร", isCorrect: false, feedback: "ความคิดว่าครั้งเดียวไม่เป็นไรเป็นกับดักที่พบบ่อย ควรใช้ทักษะรับมือแทน" },
    ],
  },
  {
    title: "วันว่างที่ไม่มีอะไรทำ",
    lesson: LESSONS[2].title,
    prompt: "วันหยุดยาวที่ไม่มีแผน คุณเริ่มรู้สึกเบื่อและคิดถึงช่วงเวลาเดิม ๆ วิธีใดช่วยได้ดีที่สุด",
    options: [
      { text: "รอดูว่าความรู้สึกจะหายไปเองหรือไม่", isCorrect: false, feedback: "ถ้าไม่มีแผน เวลาว่างมักเปิดทางให้ความคิดเดิมกลับมา" },
      { text: "วางตารางเล็ก ๆ ไว้ล่วงหน้า เช่น ออกกำลังกาย ทำอาหาร และนัดคุยกับครอบครัว", isCorrect: true, feedback: "ถูกต้อง กิจวัตรที่วางไว้ช่วยลดช่องว่างที่ความเบื่อจะเข้ามา" },
      { text: "ไปเดินในที่ที่เคยใช้เป็นประจำเพื่อทดสอบใจ", isCorrect: false, feedback: "การไปสถานที่เดิมเสี่ยงเกินไป ควรเลี่ยงในช่วงแรกของการฟื้นฟู" },
    ],
  },
];

const FAMILY_MISSIONS = [
  { title: "นั่งทานข้าวเย็นด้วยกัน", description: "ทานมื้อเย็นพร้อมกันโดยไม่เล่นโทรศัพท์ และพูดคุยเรื่องทั่วไปอย่างสบาย ๆ", points: 10 },
  { title: "เดินออกกำลังกายด้วยกัน 20 นาที", description: "ชวนกันเดินเล่นหรือขยับตัวเบา ๆ ในสวนใกล้บ้าน", points: 15 },
  { title: "ชื่นชมกัน 1 เรื่อง", description: "ต่างฝ่ายต่างบอกสิ่งดี ๆ ที่เห็นจากอีกฝ่ายในวันนี้ อย่างน้อยหนึ่งเรื่อง", points: 10 },
  { title: "วางแผนวันหยุดสั้น ๆ ร่วมกัน", description: "ช่วยกันเลือกกิจกรรมเล็ก ๆ ในสัปดาห์นี้ที่ทำร่วมกันได้", points: 20 },
];

const SKILLS = [
  { skillName: "การบริการลูกค้า", category: "service" },
  { skillName: "การใช้คอมพิวเตอร์พื้นฐาน", category: "digital" },
  { skillName: "งานครัวและประกอบอาหาร", category: "food" },
  { skillName: "งานซ่อมบำรุงเบื้องต้น", category: "technical" },
  { skillName: "การทำงานเป็นทีม", category: "soft-skill" },
];

const POSTS = [
  {
    content: "วันนี้ครบ 30 วันที่เช็คอินต่อเนื่อง ไม่ได้ยิ่งใหญ่อะไร แต่ภูมิใจในตัวเองมาก ขอบคุณทุกคนที่คอยให้กำลังใจ ใครที่กำลังเริ่มต้น ค่อย ๆ ไปทีละวันนะ",
    tags: ["กำลังใจ", "เช็คอิน"],
    comments: ["ยินดีด้วยนะ เก่งมากเลย", "ขอบคุณที่แบ่งปัน ได้กำลังใจเหมือนกัน"],
  },
  {
    content: "เทคนิคที่ได้ผลกับเรา: เวลาอยากมาก ๆ ให้ลุกไปอาบน้ำเย็นหรือเดินรอบบ้าน 10 นาที ความรู้สึกจะลดลงเองจริง ๆ ลองดูได้",
    tags: ["เทคนิค", "รับมือความอยาก"],
    comments: ["ลองแล้วได้ผล ขอบคุณค่ะ"],
  },
  {
    content: "เพิ่งได้สัมภาษณ์งานครั้งแรกหลังผ่านการบำบัด ตื่นเต้นมาก มีใครมีเคล็ดลับการเตรียมตัวสัมภาษณ์บ้างไหม",
    tags: ["งาน", "สัมภาษณ์"],
    comments: ["ซ้อมแนะนำตัวหน้ากระจก และเตรียมคำตอบเรื่องช่วงว่างงานให้กระชับ สู้ ๆ นะ"],
  },
  {
    content: "สำหรับครอบครัว: ความอดทนและการรับฟังสำคัญกว่าการตักเตือน ถ้าเขากล้าเล่าความรู้สึกให้ฟัง นั่นคือสัญญาณที่ดีแล้ว",
    tags: ["ครอบครัว", "ผู้ดูแล"],
    comments: [],
  },
];

async function findAuthors() {
  const counsellor = await User.findOne({ role: "counsellor" }).sort({ createdAt: 1 });
  const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
  const author = counsellor || admin;
  if (!author) throw new Error("No counsellor or admin account found to author the demo content.");
  const commenters = await User.find({ role: { $in: ["user", "employer"] }, verifiedStatus: "verified" })
    .sort({ createdAt: 1 })
    .limit(2);
  return { author, commenters: commenters.length ? commenters : [author] };
}

async function seed() {
  const { author, commenters } = await findAuthors();

  const lessonByTitle = new Map();
  for (const lesson of LESSONS) {
    const doc = await MicroLesson.findOneAndUpdate(
      { title: tag(lesson.title) },
      { ...lesson, title: tag(lesson.title), active: true, createdBy: author._id },
      { upsert: true, new: true }
    );
    lessonByTitle.set(lesson.title, doc);
  }

  for (const scenario of SCENARIOS) {
    await ScenarioSimulation.findOneAndUpdate(
      { title: tag(scenario.title) },
      {
        title: tag(scenario.title),
        lesson: lessonByTitle.get(scenario.lesson)._id,
        prompt: scenario.prompt,
        options: scenario.options,
        active: true,
        createdBy: author._id,
      },
      { upsert: true }
    );
  }

  for (const mission of FAMILY_MISSIONS) {
    await FamilyMission.findOneAndUpdate(
      { title: tag(mission.title) },
      { ...mission, title: tag(mission.title), active: true, createdBy: author._id },
      { upsert: true }
    );
  }

  for (const skill of SKILLS) {
    await Skill.findOneAndUpdate({ skillName: tag(skill.skillName) }, { ...skill, skillName: tag(skill.skillName) }, { upsert: true });
  }

  let commentCount = 0;
  for (const post of POSTS) {
    const content = tag(post.content);
    const doc = await Post.findOneAndUpdate(
      { content },
      { user: author._id, content, tags: post.tags, commentsEnabled: true, visibleToRoles: [], needsReview: false },
      { upsert: true, new: true }
    );
    for (const [i, text] of post.comments.entries()) {
      await Comment.findOneAndUpdate(
        { post: doc._id, content: tag(text) },
        { post: doc._id, user: commenters[i % commenters.length]._id, content: tag(text) },
        { upsert: true }
      );
      commentCount += 1;
    }
  }

  console.log(
    `Seeded demo content as ${author.email}: ${LESSONS.length} lessons, ${SCENARIOS.length} scenarios, ` +
      `${FAMILY_MISSIONS.length} family missions, ${SKILLS.length} skills, ${POSTS.length} posts, ${commentCount} comments.`
  );
}

async function clean() {
  const lessons = await MicroLesson.find({ title: startsWithTag }).select("_id");
  const scenarios = await ScenarioSimulation.find({ title: startsWithTag }).select("_id");
  const missions = await FamilyMission.find({ title: startsWithTag }).select("_id");
  const posts = await Post.find({ content: startsWithTag }).select("_id");

  const results = {
    scenarioAttempts: (await ScenarioAttempt.deleteMany({ scenario: { $in: scenarios.map((s) => s._id) } })).deletedCount,
    scenarios: (await ScenarioSimulation.deleteMany({ _id: { $in: scenarios.map((s) => s._id) } })).deletedCount,
    savedLessons: (await SavedLesson.deleteMany({ lesson: { $in: lessons.map((l) => l._id) } })).deletedCount,
    lessons: (await MicroLesson.deleteMany({ _id: { $in: lessons.map((l) => l._id) } })).deletedCount,
    familyMissionLogs: (await FamilyMissionLog.deleteMany({ familyMission: { $in: missions.map((m) => m._id) } })).deletedCount,
    familyMissions: (await FamilyMission.deleteMany({ _id: { $in: missions.map((m) => m._id) } })).deletedCount,
    skills: (await Skill.deleteMany({ skillName: startsWithTag })).deletedCount,
    comments: (await Comment.deleteMany({ $or: [{ content: startsWithTag }, { post: { $in: posts.map((p) => p._id) } }] })).deletedCount,
    savedPosts: (await SavedPost.deleteMany({ post: { $in: posts.map((p) => p._id) } })).deletedCount,
    posts: (await Post.deleteMany({ _id: { $in: posts.map((p) => p._id) } })).deletedCount,
  };
  console.log("Removed demo content:", results);
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to run demo seed with NODE_ENV=production");
    process.exit(1);
  }
  await connectDB();
  try {
    if (process.argv.includes("--clean")) await clean();
    else await seed();
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
