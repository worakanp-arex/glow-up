import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import Course from "../src/models/Course.js";
import UserCourse from "../src/models/UserCourse.js";
import UserSkill from "../src/models/UserSkill.js";
import SavedJob from "../src/models/SavedJob.js";
import {
  skillInterests, categoryInterests, pickVaried, fillWithOthers, featuredCoursesForUser, FEATURED_LIMIT,
} from "../src/services/courseRecommendationService.js";
// ตัวสร้างสไลด์ของแบนเนอร์อยู่ฝั่งหน้าเว็บ แต่เป็นฟังก์ชันล้วน จึงทดสอบจากที่นี่ได้
import { buildBannerSlides, reasonText, BANNER_LIMIT, BANNER_MIN } from "../../frontend/src/utils/courseBanner.js";
import { startServer } from "./helpers/httpServer.js";

afterEach(() => mock.restoreAll());

// สายโซ่ query ของ Mongoose ที่ resolve เป็น `result` ไม่ว่าจะเรียกเมธอดใดในสายโซ่
function chainable(result) {
  const obj = { sort: () => obj, populate: () => obj, select: () => obj, skip: () => obj, limit: () => obj, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
  return obj;
}

const course = (id, title, category, extra = {}) => ({ _id: id, title, category, tags: [], toObject() { return { ...this }; }, ...extra });
const mySkill = (id, skillName, category, level) => ({ level, skill: { _id: id, skillName, category } });

test("each skill becomes an interest, weighted by the level the user gave it", () => {
  const interests = skillInterests([
    mySkill("s1", "การปฐมพยาบาลเบื้องต้น", "care", 5),
    mySkill("s2", "การพิมพ์เอกสาร", "digital", 1),
    { level: 3, skill: null }, // ทักษะที่ถูกลบจากแคตตาล็อกแล้ว
  ]);
  assert.deepEqual(interests.map((item) => [item._id, item.kind, item.title]), [["s1", "skill", "การปฐมพยาบาลเบื้องต้น"], ["s2", "skill", "การพิมพ์เอกสาร"]]);
  const weightOf = (interest, text) => interest.terms.find((term) => term.text === text).weight;
  assert.ok(weightOf(interests[0], "ปฐมพยาบาลเบื้องต้น") > weightOf(interests[1], "พิมพ์เอกสาร"), "a higher level counts for more");
  // จับคู่จากชื่อทักษะเท่านั้น ไม่ปนคำของหมวด เพื่อให้อ้างได้ตรงๆ ว่า "ตรงกับทักษะ"
  assert.deepEqual(interests[0].terms.map((term) => term.text), ["ปฐมพยาบาลเบื้องต้น"]);
});

test("skills with no course of their own name fall back to their field, except the generic life-skills group", () => {
  const interests = categoryInterests([
    mySkill("s1", "การปฐมพยาบาลเบื้องต้น", "care", 5),
    mySkill("s2", "นวดแผนไทย", "care", 3),
    mySkill("s3", "การตรงต่อเวลา", "soft-skill", 4),
    { level: 2, skill: null },
  ]);
  assert.deepEqual(interests.map((item) => [item.kind, item.title]), [["skill-category", "ดูแลและสุขภาพ"]], "one entry per field, soft-skill excluded");
  assert.deepEqual(interests[0].terms.map((term) => term.text), ["ดูแล", "สุขภาพ"]);
  assert.ok(interests[0].terms.every((term) => term.weight < 2), "a field match is always weaker than a skill-name match");
});

test("the banner alternates between interests instead of filling up with one skill", () => {
  const entry = (courseId, interestId, score) => ({ course: { _id: courseId }, score, reason: { jobId: interestId } });
  // ranked เรียงคะแนนมากไปน้อย: ทักษะ a ได้คะแนนสูงสุด 3 คอร์ส ทักษะ b 1 คอร์ส ทักษะ c 1 คอร์ส
  const ranked = [entry("a1", "a", 9), entry("a2", "a", 8), entry("b1", "b", 7), entry("a3", "a", 6), entry("c1", "c", 5)];
  assert.deepEqual(pickVaried(ranked, 5).map((item) => item.course._id), ["a1", "b1", "c1", "a2", "a3"]);
  assert.deepEqual(pickVaried(ranked, 2).map((item) => item.course._id), ["a1", "b1"]);
  assert.deepEqual(pickVaried([], 5), []);
});

test("filler courses come from categories the banner does not show yet", () => {
  const picked = [{ course: course("p1", "เอ", "สุขภาพ"), reason: {} }];
  const rest = [course("x1", "บี", "สุขภาพ"), course("x2", "ซี", "การเงิน"), course("x3", "ดี", "ไอที"), course("p1", "เอ", "สุขภาพ")];
  const filled = fillWithOthers(picked, rest, 3);
  assert.deepEqual(filled.map((item) => item.course._id), ["p1", "x2", "x3"]);
  assert.equal(filled[1].reason, null);
  // ไม่มีคอร์สอื่นให้เติม ก็คืนเท่าที่มี
  assert.equal(fillWithOthers([], [course("only", "หนึ่ง", "ก")], 5).length, 1);
});

function stubDatabase({ skills = [], courses, enrolled = [] }) {
  mock.method(UserSkill, "find", () => chainable(skills));
  mock.method(SavedJob, "find", () => chainable([]));
  mock.method(Course, "find", () => chainable(courses));
  mock.method(UserCourse, "find", () => chainable(enrolled));
}

test("featured courses follow the user's skills, alternate between them and say why", async () => {
  stubDatabase({
    skills: [mySkill("s1", "การปฐมพยาบาลเบื้องต้น", "care", 5), mySkill("s2", "การพิมพ์เอกสาร", "digital", 2)],
    courses: [
      course("c-money", "การเงินเพื่อชีวิต", "การเงิน"),
      course("c-aid", "ปฐมพยาบาลเบื้องต้นสำหรับทุกคน", "สุขภาพ"),
      course("c-mind", "ดูแลใจตัวเอง", "สุขภาพจิต"),
      course("c-type", "พิมพ์เอกสารและงานสำนักงาน", "ไอทีเบื้องต้น"),
      course("c-saved", "ปฐมพยาบาลขั้นสูง", "สุขภาพ"),
    ],
    enrolled: [{ course: "c-saved" }],
  });

  const result = await featuredCoursesForUser("u1");
  // c-saved ถูกผู้ใช้บันทึกไว้แล้วจึงไม่ซ้ำ และ c-money ไม่เกี่ยวกับทักษะใดเลยจึงมาเป็นตัวเติมท้ายสุด
  assert.deepEqual(result.map((item) => item._id), ["c-aid", "c-type", "c-mind", "c-money"]);
  assert.deepEqual(result[0].reason, { source: "skill", label: "การปฐมพยาบาลเบื้องต้น", matched: ["ปฐมพยาบาลเบื้องต้น"] });
  assert.equal(result[1].reason.label, "การพิมพ์เอกสาร");
  // "ดูแลใจตัวเอง" ไม่ได้ชื่อตรงกับทักษะใด แต่อยู่ในสายงานดูแลและสุขภาพ จึงบอกเป็นสายงานไม่ใช่ทักษะ
  assert.deepEqual(result[2].reason, { source: "skill-category", label: "ดูแลและสุขภาพ", matched: ["ดูแล", "สุขภาพ"] });
  assert.deepEqual(result[3].reason, { source: "general", label: null, matched: [] });
});

test("a user with no skills or saved jobs still gets a varied set of open courses", async () => {
  stubDatabase({
    courses: [course("a", "เอ", "สุขภาพ"), course("b", "บี", "สุขภาพ"), course("c", "ซี", "การเงิน"), course("d", "ดี", "ไอที"), course("e", "อี", "ครอบครัว"), course("f", "เอฟ", "การเงิน"), course("g", "จี", "สุขภาพจิต")],
  });
  const result = await featuredCoursesForUser("u1");
  assert.equal(result.length, FEATURED_LIMIT);
  assert.ok(result.every((item) => item.reason.source === "general"));
  assert.equal(new Set(result.map((item) => item.category)).size, FEATURED_LIMIT, "every slide is from a different category");
});

test("featured courses are for signed-in learners only", { timeout: 10000 }, async (t) => {
  const base = await startServer(t);
  const guest = await fetch(`${base}/api/courses/featured`);
  await guest.text();
  assert.equal(guest.status, 401);
});

// ---------- ตัวสร้างสไลด์ฝั่งหน้าเว็บ ----------

const open = (id, extra = {}) => ({ _id: id, title: `คอร์ส ${id}`, ...extra });

test("the course you were taking comes first, then the picks, each course once", () => {
  const all = [open("a"), open("b"), open("c"), open("d")];
  const slides = buildBannerSlides({
    continuing: all[2],
    featured: [open("b", { reason: { source: "skill", label: "งานครัว" } }), open("c", { reason: { source: "general" } }), open("a", { reason: { source: "saved-job", label: "ผู้ช่วยกุ๊ก" } }), open("d", { reason: { source: "skill-category", label: "ดูแลและสุขภาพ" } })],
    courses: all,
  });
  assert.deepEqual(slides.map((slide) => slide.course._id), ["c", "b", "a", "d"]);
  assert.deepEqual(slides.map((slide) => slide.continuing), [true, false, false, false]);
  assert.equal(slides[0].eyebrow, "เรียนต่อจากครั้งที่แล้ว");
  assert.equal(slides[1].reason, "ตรงกับทักษะที่คุณสนใจ: งานครัว");
  assert.equal(slides[2].reason, "เพราะคุณบันทึกงาน “ผู้ช่วยกุ๊ก” ไว้");
  assert.equal(slides[3].reason, "เหมาะกับสายงานที่คุณสนใจ: ดูแลและสุขภาพ");
  // ใช้ตำแหน่งในรายการทั้งหมดเลือกรูปสำรองให้ตรงกับการ์ดคอร์ส
  assert.deepEqual(slides.map((slide) => slide.coverIndex), [2, 1, 0, 3]);
});

test("staff and learners without picks still get a banner that can rotate", () => {
  const all = [open("a"), open("b"), open("c"), open("d"), open("e")];
  const slides = buildBannerSlides({ courses: all });
  assert.equal(slides.length, BANNER_MIN);
  assert.ok(slides.every((slide) => slide.reason === null && !slide.continuing));
  assert.equal(buildBannerSlides({ courses: [] }).length, 0);
  assert.equal(buildBannerSlides({ courses: [open("only")] }).length, 1);
});

test("the banner never shows more than the limit", () => {
  const picks = Array.from({ length: 9 }, (_, i) => open(`p${i}`, { reason: { source: "general" } }));
  assert.equal(buildBannerSlides({ continuing: open("now"), featured: picks, courses: picks }).length, BANNER_LIMIT);
  assert.equal(reasonText({ source: "general" }), null);
  assert.equal(reasonText(undefined), null);
});
