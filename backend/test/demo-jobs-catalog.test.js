import { test } from "node:test";
import assert from "node:assert/strict";
import { JOBS, EMPLOYERS } from "../src/config/demoCatalog.js";
import { DEFAULT_SKILLS } from "../src/constants/skills.js";
import { ATTACHMENT_TYPES } from "../src/constants/attachmentTypes.js";
// ใช้ตัวแยกคำอธิบายตัวเดียวกับหน้าเว็บ เพื่อพิสูจน์ว่าข้อความตัวอย่างแสดงเป็นรายการจริง ไม่ใช่แค่ก้อนข้อความ
import { splitDescription, jobSummary } from "../../frontend/src/utils/jobDescription.js";

const ALL_SKILLS = new Set(Object.values(DEFAULT_SKILLS).flat());
const LISTED = JOBS.filter((job) => job.state !== "rejected");
const OPEN = JOBS.filter((job) => job.state === "open");

test("every demo job uses real catalogue skills, real employers and allowed attachments", () => {
  const employers = new Set(EMPLOYERS.map((employer) => employer.key));
  for (const job of JOBS) {
    assert.ok(employers.has(job.employer), `${job.title}: unknown employer ${job.employer}`);
    assert.ok(job.skills.length > 0, `${job.title}: no skills`);
    for (const name of job.skills) assert.ok(ALL_SKILLS.has(name), `${job.title}: unknown skill "${name}"`);
    for (const name of job.attachments || []) assert.ok(ATTACHMENT_TYPES.includes(name), `${job.title}: unknown attachment "${name}"`);
  }
});

test("demo jobs carry no made-up link to an original posting", () => {
  // บริษัทตัวอย่างไม่มีประกาศต้นฉบับจริง จึงต้องไม่มีลิงก์ที่กดแล้วไปไม่ถึงงานนั้น
  for (const job of JOBS) assert.equal(job.externalUrl, undefined, `${job.title} has externalUrl`);
});

test("every listed job spells out duties and what the applicant must be able to do", () => {
  for (const job of LISTED) {
    const { about, duties, requirements } = splitDescription(job.description);
    assert.ok(about.length >= 1, `${job.title}: no intro`);
    assert.ok(duties.length >= 2, `${job.title}: needs at least 2 duties, has ${duties.length}`);
    assert.ok(requirements.length >= 2, `${job.title}: needs at least 2 requirements, has ${requirements.length}`);
  }
});

test("open jobs are detailed, including conditions such as hours and benefits", () => {
  for (const job of OPEN) {
    const { duties, requirements, benefits } = splitDescription(job.description);
    assert.ok(duties.length >= 3, `${job.title}: open job needs at least 3 duties`);
    assert.ok(requirements.length >= 3, `${job.title}: open job needs at least 3 requirements`);
    assert.ok(benefits.length >= 2, `${job.title}: open job needs at least 2 benefit lines`);
    assert.ok(job.description.length > 350, `${job.title}: description is too thin`);
  }
});

test("job descriptions differ from each other and vary in structure", () => {
  assert.equal(new Set(JOBS.map((job) => job.description)).size, JOBS.length);
  assert.equal(new Set(JOBS.map((job) => job.title)).size, JOBS.length);
  // ไม่ใช่ทุกประกาศที่มีจำนวนข้อเท่ากัน (กันไม่ให้ทุกงานดูเหมือนใช้แม่แบบเดียวกัน)
  const shapes = new Set(OPEN.map((job) => {
    const s = splitDescription(job.description);
    return [s.about.length, s.duties.length, s.requirements.length, s.benefits.length].join("-");
  }));
  assert.ok(shapes.size >= 6, `only ${shapes.size} distinct description shapes`);
  assert.ok(new Set(JOBS.map((job) => job.location)).size >= 8, "locations should vary");
});

test("the description parser keeps old-style postings working", () => {
  // ประกาศรุ่นเก่าที่มีแต่ "- ..." ต้องยังเป็นรายการหน้าที่
  const old = splitDescription("ร่วมงานกับเรา\n- ขายของ\n* ทอนเงิน\n1. ปิดร้าน");
  assert.deepEqual(old.about, ["ร่วมงานกับเรา"]);
  assert.deepEqual(old.duties, ["ขายของ", "ทอนเงิน", "ปิดร้าน"]);
  // "12.5 บาท" ไม่ใช่หัวข้อย่อย และบรรทัดที่ไม่ใช่หัวข้อที่รู้จักแม้ลงท้ายด้วย ":" ก็ยังเป็นย่อหน้า
  const plain = splitDescription("ค่าจ้าง 12.5 บาทต่อชั่วโมง\nเวลาทำงาน:\n- เช้า");
  assert.deepEqual(plain.about, ["ค่าจ้าง 12.5 บาทต่อชั่วโมง", "เวลาทำงาน:"]);
  assert.deepEqual(plain.duties, ["เช้า"]);
  assert.equal(jobSummary("แนะนำงาน\nหน้าที่หลัก:\n- ก"), "แนะนำงาน");
  assert.equal(jobSummary("- ก\n- ข"), "ก · ข");
});
