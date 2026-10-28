import { test } from "node:test";
import assert from "node:assert/strict";
import { rankCourses, termsFrom } from "../src/services/courseRecommendationService.js";

const job = (id, title, terms) => ({ _id: id, title, terms: terms.map(([text, weight = 2]) => ({ text, weight })) });

test("skill names are cut into the words a course title would use", () => {
  assert.deepEqual(termsFrom("งานครัวและประกอบอาหาร"), ["ครัว", "ประกอบอาหาร"]);
  assert.deepEqual(termsFrom("การบริการลูกค้า"), ["บริการลูกค้า"]);
  assert.deepEqual(termsFrom("Microsoft Office"), ["Microsoft", "Office"]);
  assert.deepEqual(termsFrom(undefined), []);
});

test("a course is suggested for the saved job it shares the most with, and says why", () => {
  const courses = [
    { _id: "c1", title: "การบริการลูกค้าเบื้องต้น", description: "ทักษะการสื่อสารกับลูกค้า", category: "ทักษะอาชีพ", tags: [] },
    { _id: "c2", title: "ทำอาหารไทย", category: "ครัว", tags: ["ประกอบอาหาร"] },
    { _id: "c3", title: "การเงินส่วนบุคคล", tags: [] },
  ];
  const savedJobs = [
    job("j1", "พนักงานเสิร์ฟ", [["บริการลูกค้า"], ["สื่อสาร"]]),
    job("j2", "ผู้ช่วยกุ๊ก", [["ครัว"], ["ประกอบอาหาร"]]),
  ];

  const ranked = rankCourses(courses, savedJobs);
  assert.deepEqual(ranked.map((item) => item.course._id), ["c1", "c2"], "the unrelated course is left out");
  assert.equal(ranked[0].reason.jobTitle, "พนักงานเสิร์ฟ");
  assert.deepEqual(ranked[0].reason.matched, ["บริการลูกค้า", "สื่อสาร"]);
  assert.equal(ranked[1].reason.jobId, "j2");
});

test("a tie goes to the job saved most recently, and repeated words count once", () => {
  const courses = [{ _id: "c1", title: "การสื่อสารในที่ทำงาน", tags: [] }];
  const ranked = rankCourses(courses, [
    job("newer", "งานใหม่", [["สื่อสาร"]]),
    job("older", "งานเก่า", [["สื่อสาร"]]),
  ]);
  assert.equal(ranked[0].reason.jobId, "newer");

  const repeated = rankCourses(courses, [job("j", "งาน", [["สื่อสาร"], ["สื่อสาร"]])]);
  assert.equal(repeated[0].score, 2);
});

test("no saved jobs, or nothing in common, suggests nothing", () => {
  assert.deepEqual(rankCourses([{ _id: "c1", title: "การเงิน" }], []), []);
  assert.deepEqual(rankCourses([{ _id: "c1", title: "การเงิน" }], [job("j", "งาน", [["ครัว"]])]), []);
});
