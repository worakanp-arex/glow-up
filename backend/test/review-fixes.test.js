import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import Job from "../src/models/Job.js";
import JobSkill from "../src/models/JobSkill.js";
import Skill from "../src/models/Skill.js";
import SavedJob from "../src/models/SavedJob.js";
import UserSkill from "../src/models/UserSkill.js";
import JobCategory from "../src/models/JobCategory.js";
import Course from "../src/models/Course.js";
import { createJob, mySavedJobs } from "../src/controllers/jobController.js";
import { getRecommendedCareers } from "../src/controllers/careerController.js";
import { createCourse } from "../src/controllers/courseController.js";
import { fillWithOthers } from "../src/services/courseRecommendationService.js";

afterEach(() => mock.restoreAll());

const response = () => ({
  code: 200,
  body: null,
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; },
});

// สายโซ่ query ของ Mongoose ที่ resolve เป็น `result` ไม่ว่าจะเรียกเมธอดใดในสายโซ่
function chainable(result) {
  const obj = { sort: () => obj, populate: () => obj, select: () => obj, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
  return obj;
}

const employer = { id: "e1", role: "employer" };

test("a job cannot be posted with a skill that is not in the catalogue", async () => {
  mock.method(Skill, "countDocuments", async () => 1);
  const created = mock.method(Job, "create", async () => { throw new Error("should not be created"); });
  const res = response();
  await createJob({ body: { title: "พนักงานครัว", skills: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"] }, user: employer }, res);
  assert.equal(res.code, 400);
  assert.equal(created.mock.callCount(), 0, "no half-saved job is left behind");
});

test("the same skill picked twice is stored once", async () => {
  mock.method(Skill, "countDocuments", async () => 1);
  const job = { _id: "j1", populate: async () => {}, toObject: () => ({ _id: "j1" }) };
  mock.method(Job, "create", async () => job);
  const inserted = mock.method(JobSkill, "insertMany", async () => []);
  mock.method(JobSkill, "find", () => chainable([{ skill: { _id: "s1" } }, { skill: null }]));
  const res = response();
  await createJob({ body: { title: "พนักงานครัว", skills: ["s1", "s1"] }, user: employer }, res);
  assert.equal(res.code, 201);
  assert.deepEqual(inserted.mock.calls[0].arguments[0], [{ job: "j1", skill: "s1" }]);
  // ทักษะที่ถูกลบจากแคตตาล็อก (populate เป็น null) ไม่หลุดไปถึงหน้าเว็บ
  assert.deepEqual(res.body.skills, [{ _id: "s1" }]);
});

test("career suggestions only count jobs that seekers can actually see", async () => {
  mock.method(JobCategory, "find", async () => []);
  const jobFind = mock.method(Job, "find", () => chainable([]));
  mock.method(UserSkill, "find", () => chainable([]));
  mock.method(JobSkill, "find", () => chainable([]));
  await getRecommendedCareers({ user: { id: "u1" } }, response());
  const filter = jobFind.mock.calls[0].arguments[0];
  assert.equal(filter.status, "open");
  assert.equal(filter.verifiedStatus, "verified");
  assert.ok(filter.$or, "expired jobs are excluded");
});

test("saved jobs whose employer deleted their account are not returned", async () => {
  mock.method(SavedJob, "find", () => chainable([{ job: "j1" }, { job: "j2" }]));
  const job = (id, employerDoc) => ({ _id: id, employer: employerDoc, toObject() { return { _id: id }; } });
  mock.method(Job, "find", () => chainable([job("j1", null), job("j2", { name: "ร้านอาหาร" })]));
  mock.method(JobSkill, "find", () => chainable([]));
  const res = response();
  await mySavedJobs({ user: { id: "u1" } }, res);
  assert.deepEqual(res.body.map((item) => item._id), ["j2"]);
});

test("a course cannot be created that ends before it starts", async () => {
  const created = mock.method(Course, "create", async () => ({}));
  const res = response();
  await createCourse({ user: { id: "s1" }, body: { title: "คอร์ส", externalUrl: "https://learn.example", startDate: "2026-10-10", endDate: "2026-10-01" } }, res);
  assert.equal(res.code, 400);
  assert.equal(created.mock.callCount(), 0);
});

test("banner filler prefers a real new category over an uncategorised course", () => {
  const course = (id, category) => ({ _id: id, category });
  const filled = fillWithOthers([{ course: course("p", "สุขภาพ"), reason: {} }], [course("none"), course("money", "การเงิน")], 2);
  assert.deepEqual(filled.map((item) => item.course._id), ["p", "money"]);
});
