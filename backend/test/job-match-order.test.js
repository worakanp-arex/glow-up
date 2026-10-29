import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import Job from "../src/models/Job.js";
import JobSkill from "../src/models/JobSkill.js";
import UserSkill from "../src/models/UserSkill.js";
import { listJobsByMatch } from "../src/controllers/jobController.js";
import { startServer } from "./helpers/httpServer.js";

afterEach(() => mock.restoreAll());

const response = () => ({
  code: 200,
  body: null,
  headers: {},
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; },
  setHeader(name, value) { this.headers[name] = value; },
});

// สายโซ่ query ของ Mongoose ที่ resolve เป็น `result` ไม่ว่าจะเรียกเมธอดใดในสายโซ่
function chainable(result) {
  const obj = { sort: () => obj, populate: () => obj, select: () => obj, skip: () => obj, limit: () => obj, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
  return obj;
}

// id ของทักษะที่ทั้ง String() และ ._id ใช้ได้ เหมือนเอกสาร Mongoose ที่ populate แล้ว
const skill = (id) => ({ _id: id, toString: () => id });

// ผู้ใช้มีทักษะ s1 และ s2 งานแต่ละตำแหน่งต้องการทักษะต่างกัน
const MINE = [{ skill: "s1" }, { skill: "s2" }];
const JOBS = [
  { _id: "A", title: "A ตรง 1 ใน 2", skills: ["s1", "s9"], createdAt: new Date("2026-10-01") },
  { _id: "B", title: "B ตรง 1 ใน 1", skills: ["s1"], createdAt: new Date("2026-09-01") },
  { _id: "C", title: "C ไม่ระบุทักษะ", skills: [], createdAt: new Date("2026-10-20") },
  { _id: "D", title: "D ตรง 2 ใน 4", skills: ["s1", "s2", "s8", "s9"], createdAt: new Date("2026-08-01") },
  { _id: "E", title: "E นายจ้างถูกลบ", skills: ["s1"], createdAt: new Date("2026-10-25"), deletedEmployer: true },
];

function stubModels() {
  mock.method(UserSkill, "find", () => chainable(MINE));
  mock.method(JobSkill, "find", () => chainable(JOBS.flatMap((job) => job.skills.map((id) => ({ job: job._id, skill: skill(id) })))));
  mock.method(Job, "find", (filter) => {
    // ครั้งแรกคือหาผู้เข้าชิงทั้งชุด ครั้งที่สองคือดึงเฉพาะงานของหน้านี้ (ส่งกลับสลับลำดับเพื่อพิสูจน์ว่ามีการเรียงใหม่)
    if (filter._id) {
      return chainable(JOBS.filter((job) => filter._id.$in.includes(job._id)).reverse().map((job) => ({ ...job, employer: { name: "บริษัท" }, toObject() { return { ...this }; } })));
    }
    return chainable(JOBS.map((job) => ({ ...job, employer: job.deletedEmployer ? null : { _id: "emp" } })));
  });
}

test("jobs are ordered by skill match, highest first, before pagination", async () => {
  stubModels();
  const req = { query: {}, user: { id: "u1", role: "user" } };
  const res = response();
  await listJobsByMatch(req, res);
  // B 100% -> D 50% (ตรง 2 ข้อ) -> A 50% (ตรง 1 ข้อ) -> C ไม่ระบุทักษะ อยู่ท้ายสุด ส่วน E ถูกตัดออก
  assert.deepEqual(res.body.map((job) => job._id), ["B", "D", "A", "C"]);
});

test("page 2 continues the global ranking and X-Total-Count counts the whole set", async () => {
  stubModels();
  const first = response();
  await listJobsByMatch({ query: { page: "1", limit: "2" }, user: { id: "u1", role: "user" } }, first);
  const second = response();
  await listJobsByMatch({ query: { page: "2", limit: "2" }, user: { id: "u1", role: "user" } }, second);

  assert.deepEqual(first.body.map((job) => job._id), ["B", "D"]);
  assert.deepEqual(second.body.map((job) => job._id), ["A", "C"]);
  assert.equal(first.headers["X-Total-Count"], 4);
  // งานที่ส่งกลับมาพร้อมทักษะ เพื่อให้หน้าเว็บคำนวณป้าย "ทักษะตรง" ได้
  assert.deepEqual(first.body[0].skills.map((s) => s._id), ["s1"]);
});

test("the ranked job list is for signed-in job seekers only", { timeout: 10000 }, async (t) => {
  const base = await startServer(t);
  const guest = await fetch(`${base}/api/jobs/matched`);
  await guest.text();
  assert.equal(guest.status, 401);
});
