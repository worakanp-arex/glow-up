import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Job from "../src/models/Job.js";
import Post from "../src/models/Post.js";
import SavedPost from "../src/models/SavedPost.js";
import Application from "../src/models/Application.js";
import FamilyLink from "../src/models/FamilyLink.js";
import FamilyMission from "../src/models/FamilyMission.js";
import MicroLesson from "../src/models/MicroLesson.js";
import ScenarioSimulation from "../src/models/ScenarioSimulation.js";
import CounsellingSession from "../src/models/CounsellingSession.js";
import ActivityMissionLog from "../src/models/ActivityMissionLog.js";
import WeeklyCheckIn from "../src/models/WeeklyCheckIn.js";
import RiskSituationLog from "../src/models/RiskSituationLog.js";
import LoginEvent from "../src/models/LoginEvent.js";
import Notification from "../src/models/Notification.js";
import JobSkill from "../src/models/JobSkill.js";
import UserSkill from "../src/models/UserSkill.js";
import { listQueue } from "../src/controllers/counsellingController.js";
import { notifyLinkedFamily } from "../src/services/rewardService.js";
import { listPendingActivityApprovals, reviewActivityLog } from "../src/controllers/activityMissionController.js";
import { submitWeeklyCheckIn } from "../src/controllers/weeklyCheckInController.js";
import { createRiskSituationLog } from "../src/controllers/riskSituationController.js";
import { getOverviewUsers } from "../src/controllers/overviewController.js";
import { listEmployerApplications } from "../src/controllers/applicationController.js";
import { updateJob } from "../src/controllers/jobController.js";
import { addComment, likePost, toggleSavePost } from "../src/controllers/postController.js";
import { getMicroLesson, updateMicroLesson } from "../src/controllers/microLessonController.js";
import { updateScenario } from "../src/controllers/scenarioController.js";
import { updateFamilyMission } from "../src/controllers/familyMissionController.js";
import { canDownloadFile } from "../src/middleware/authorizeDownload.js";
import { verifyToken } from "../src/middleware/authMiddleware.js";

afterEach(() => mock.restoreAll());

const response = () => ({
  code: 200,
  body: null,
  headers: {},
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; },
  send() { return this; },
  setHeader(name, value) { this.headers[name] = value; },
});

// สายโซ่ query ของ Mongoose ที่ resolve เป็น `result` ไม่ว่าจะเรียกเมธอดใดในสายโซ่
function chainable(result) {
  const obj = { sort: () => obj, populate: () => obj, select: () => obj, skip: () => obj, limit: () => obj, lean: () => obj, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
  return obj;
}

function doc(fields) {
  return { ...fields, save: mock.fn(async function save() { return this; }), toObject() { return { ...this }; }, populate: async function populate() { return this; } };
}

function captureNotifications() {
  const created = [];
  mock.method(Notification, "create", async (notification) => { created.push(notification); return notification; });
  return created;
}

// session ปรึกษาตามที่ได้จาก find().populate(): `populated()`
// ตอบด้วย id ที่ฟิลด์ counsellor ถูก populate มา
function session({ id, counsellor = null, user = { _id: "p1", name: "ผู้ป่วย", email: "p@example.com", phone: "0800000000" } }) {
  return {
    _id: id,
    sessionType: "chat",
    status: counsellor ? "active" : "pending",
    scheduledAt: new Date("2030-01-01T03:00:00Z"),
    createdAt: new Date("2029-12-30T03:00:00Z"),
    topic: "หัวข้อลับ",
    mood: "sad",
    message: "ข้อความลับ",
    messages: [{ content: "แชตลับ" }],
    outcome: { summary: "สรุปทางคลินิก" },
    user,
    counsellor,
    populated: (path) => (path === "counsellor" ? counsellor?._id : undefined),
  };
}

// ---------- คิวปรึกษา: เคสของผู้ให้คำปรึกษาคนอื่น ----------

const doctor = (id) => ({ _id: id, name: `หมอ ${id}` });

test("a counsellor sees full detail only for their own and unclaimed cases; another counsellor's case is a bare calendar entry", async () => {
  mock.method(CounsellingSession, "find", () => chainable([
    session({ id: "mine", counsellor: doctor("c1") }),
    session({ id: "open" }),
    session({ id: "theirs", counsellor: doctor("c2") }),
  ]));
  const res = response();
  await listQueue({ query: {}, user: { id: "c1", role: "counsellor" } }, res);

  const [mine, open, theirs] = res.body;
  assert.equal(mine.topic, "หัวข้อลับ");
  assert.equal(mine.user.email, "p@example.com");
  assert.equal(open.message, "ข้อความลับ");

  assert.equal(theirs.restricted, true);
  assert.deepEqual(Object.keys(theirs).sort(), ["_id", "counsellor", "createdAt", "restricted", "scheduledAt", "sessionType", "status"]);
  for (const secret of ["user", "topic", "mood", "message", "messages", "outcome"]) {
    assert.equal(secret in theirs, false, `${secret} must not leak`);
  }
  assert.equal(theirs.counsellor.name, "หมอ c2");
});

test("searching the queue by patient cannot reveal another counsellor's case", async () => {
  let filter;
  mock.method(CounsellingSession, "find", (f) => { filter = f; return chainable([]); });
  await listQueue({ query: { user: "507f1f77bcf86cd799439011" }, user: { id: "c1", role: "counsellor" } }, response());
  assert.deepEqual(filter.$or, [{ counsellor: null }, { counsellor: "c1" }]);
});

test("an admin still sees every case in full", async () => {
  let filter;
  mock.method(CounsellingSession, "find", (f) => { filter = f; return chainable([session({ id: "theirs", counsellor: doctor("c2") })]); });
  const res = response();
  await listQueue({ query: { user: "507f1f77bcf86cd799439011" }, user: { id: "a1", role: "admin" } }, res);
  assert.equal("$or" in filter, false);
  assert.equal(res.body[0].message, "ข้อความลับ");
  assert.equal(res.body[0].restricted, undefined);
});

// ---------- หมุดหมายครอบครัวเป็นไปตามสวิตช์แชร์ความก้าวหน้า ----------

test("a patient who turned progress sharing off sends the family no milestone notice", async () => {
  mock.method(User, "findById", () => chainable({ familySharing: { progress: false, missions: true } }));
  mock.method(FamilyLink, "find", async () => assert.fail("must not even look up the family"));
  const created = captureNotifications();
  await notifyLinkedFamily("patient1", "ครบ 30 วัน");
  assert.equal(created.length, 0);
});

test("milestones still reach the family when sharing is on or was never configured", async () => {
  mock.method(FamilyLink, "find", async () => [{ familyUser: "fam1" }]);
  for (const user of [{ familySharing: { progress: true } }, {}, null]) {
    mock.method(User, "findById", () => chainable(user));
    const created = captureNotifications();
    await notifyLinkedFamily("patient1", "ครบ 30 วัน");
    assert.equal(created.length, 1);
    assert.equal(created[0].user, "fam1");
    mock.restoreAll();
    mock.method(FamilyLink, "find", async () => [{ familyUser: "fam1" }]);
  }
});

// ---------- ภาพรวม: รายการที่แสดงชื่อถูกจำกัดสำหรับผู้ให้คำปรึกษา ----------

function mockCounsellorPatients({ assigned = [], withSession = [], others = [] }) {
  mock.method(User, "find", (filter) => {
    if (filter.assignedCounsellor) return chainable(assigned.map((_id) => ({ _id })));
    return chainable(others);
  });
  mock.method(CounsellingSession, "distinct", async () => withSession);
}

test("the 'active people' drill-down lists only patients the counsellor may see and counts the rest as hidden", async () => {
  mockCounsellorPatients({ assigned: ["p1"], others: [{ _id: "p1", name: "ผู้ป่วยของฉัน" }] });
  mock.method(LoginEvent, "aggregate", async () => [
    { _id: "p1", lastLogin: "2030-01-02", days: 3 },
    { _id: "p2", lastLogin: "2030-01-02", days: 5 },
  ]);
  const res = response();
  await getOverviewUsers({ query: { kind: "active" }, user: { id: "c1", role: "counsellor" } }, res);
  assert.equal(res.body.total, 2);
  assert.equal(res.body.hidden, 1);
  assert.deepEqual(res.body.items.map((item) => item.user._id), ["p1"]);
});

test("today's appointments drill-down hides patients the counsellor may not see, but an admin sees all", async () => {
  mockCounsellorPatients({ assigned: ["p1"] });
  const todays = [
    { _id: "s1", user: { _id: "p1", name: "ของฉัน" }, counsellor: doctor("c1"), topic: "a", status: "scheduled", scheduledAt: new Date() },
    { _id: "s2", user: { _id: "p2", name: "คนอื่น" }, counsellor: doctor("c2"), topic: "b", status: "scheduled", scheduledAt: new Date() },
  ];
  mock.method(CounsellingSession, "find", () => chainable(todays));

  const asCounsellor = response();
  await getOverviewUsers({ query: { kind: "appointments" }, user: { id: "c1", role: "counsellor" } }, asCounsellor);
  assert.deepEqual(asCounsellor.body.items.map((item) => item.sessionId), ["s1"]);
  assert.equal(asCounsellor.body.hidden, 1);

  const asAdmin = response();
  await getOverviewUsers({ query: { kind: "appointments" }, user: { id: "a1", role: "admin" } }, asAdmin);
  assert.deepEqual(asAdmin.body.items.map((item) => item.sessionId), ["s1", "s2"]);
  assert.equal(asAdmin.body.hidden, 0);
});

// ---------- การอนุมัติกิจกรรม ----------

function mockPatientOwnership({ mine = [], unassigned = [], sessionWithMe = [] }) {
  mock.method(User, "find", (filter) => {
    if (filter.assignedCounsellor === null) return chainable(unassigned.map((_id) => ({ _id })));
    return chainable(mine.map((_id) => ({ _id })));
  });
  mock.method(CounsellingSession, "distinct", async () => sessionWithMe);
}

test("a counsellor's approval queue skips patients who belong to another counsellor", async () => {
  mockPatientOwnership({ mine: ["p1"], unassigned: ["p2"] });
  mock.method(ActivityMissionLog, "find", () => chainable([
    { _id: "l1", user: { _id: "p1" } },
    { _id: "l2", user: { _id: "p2" } },
    { _id: "l3", user: { _id: "p3" } },
  ]));
  const res = response();
  await listPendingActivityApprovals({ user: { id: "c1", role: "counsellor" } }, res);
  assert.deepEqual(res.body.map((log) => log._id), ["l1", "l2"]);
});

test("an admin sees the whole approval queue", async () => {
  mock.method(User, "find", () => assert.fail("admins need no ownership lookup"));
  mock.method(ActivityMissionLog, "find", () => chainable([{ _id: "l1", user: { _id: "p1" } }, { _id: "l3", user: { _id: "p3" } }]));
  const res = response();
  await listPendingActivityApprovals({ user: { id: "a1", role: "admin" } }, res);
  assert.equal(res.body.length, 2);
});

test("a counsellor cannot approve activity logged by another counsellor's patient", async () => {
  mockPatientOwnership({});
  const log = doc({ _id: "l3", user: "p3", activityMission: "m1", pointsAwarded: 5 });
  mock.method(ActivityMissionLog, "findOne", async () => log);
  const res = response();
  await reviewActivityLog({ params: { id: "l3" }, body: { approved: true }, user: { id: "c1", role: "counsellor" } }, res);
  assert.equal(res.code, 403);
  assert.equal(log.save.mock.callCount(), 0);
});

// ---------- การแจ้งเตือนความปลอดภัย ----------

function mockCareTeam({ assignedCounsellor = null, staff }) {
  let staffFilter;
  mock.method(User, "findById", () => chainable({ name: "สมชาย", assignedCounsellor }));
  mock.method(User, "find", (filter) => { staffFilter = filter; return chainable(staff.map((_id) => ({ _id }))); });
  return () => staffFilter;
}

test("a self-harm flag pages the assigned counsellor and the admins, not every counsellor", async () => {
  const staffFilter = mockCareTeam({ assignedCounsellor: "c9", staff: ["c9", "a1"] });
  let call = 0;
  mock.method(WeeklyCheckIn, "findOneAndUpdate", async () => (++call === 1 ? { _id: "w1", selfHarmRiskFlag: true } : { _id: "w1" }));
  const created = captureNotifications();
  const res = response();
  await submitWeeklyCheckIn({ user: { id: "p1" }, body: { stressLevel: 4, moodTrend: "worsening", selfHarmRiskFlag: true } }, res);

  assert.deepEqual(staffFilter(), { $or: [{ role: "admin" }, { _id: "c9" }] });
  assert.deepEqual(created.map((n) => String(n.user)).sort(), ["a1", "c9"]);
  assert.ok(created.every((n) => n.type === "riskAlert"));
});

test("a patient nobody looks after yet still alerts every counsellor and admin", async () => {
  const staffFilter = mockCareTeam({ staff: ["c1", "c2", "a1"] });
  let call = 0;
  mock.method(WeeklyCheckIn, "findOneAndUpdate", async () => (++call === 1 ? { _id: "w1", selfHarmRiskFlag: true } : { _id: "w1" }));
  const created = captureNotifications();
  await submitWeeklyCheckIn({ user: { id: "p1" }, body: { stressLevel: 4, moodTrend: "worsening", selfHarmRiskFlag: true } }, response());
  assert.deepEqual(staffFilter(), { role: { $in: ["admin", "counsellor"] } });
  assert.equal(created.length, 3);
});

test("resubmitting the weekly check-in inside the cooldown does not page the team again", async () => {
  mockCareTeam({ staff: ["c1", "a1"] });
  let call = 0;
  let claimFilter;
  mock.method(WeeklyCheckIn, "findOneAndUpdate", async (filter) => {
    if (++call === 1) return { _id: "w1", selfHarmRiskFlag: true };
    claimFilter = filter;
    return null; // มีคนจองการแจ้งเตือนไปแล้วภายในช่วงพัก
  });
  const created = captureNotifications();
  const res = response();
  await submitWeeklyCheckIn({ user: { id: "p1" }, body: { stressLevel: 4, moodTrend: "worsening", selfHarmRiskFlag: true } }, res);

  assert.equal(res.code, 201, "the patient's own submission still succeeds");
  assert.equal(created.length, 0);
  assert.equal(claimFilter.selfHarmRiskFlag, true);
  assert.equal(claimFilter.$or.length, 2);
});

test("a check-in without the self-harm flag never alerts anyone", async () => {
  mock.method(WeeklyCheckIn, "findOneAndUpdate", async (filter) => {
    assert.equal(filter.user, "p1", "only the upsert runs");
    return { _id: "w1", selfHarmRiskFlag: false };
  });
  mock.method(User, "find", () => assert.fail("no staff lookup"));
  const created = captureNotifications();
  await submitWeeklyCheckIn({ user: { id: "p1" }, body: { stressLevel: 2, moodTrend: "stable" } }, response());
  assert.equal(created.length, 0);
});

test("a relapse is recorded every time but only the first one in a day pages the team", async () => {
  mockCareTeam({ staff: ["c1", "a1"] });
  mock.method(RiskSituationLog, "create", async (data) => ({ _id: "log2", ...data }));
  const exists = mock.method(RiskSituationLog, "exists", async () => null);
  let created = captureNotifications();
  await createRiskSituationLog({ user: { id: "p1" }, body: { situation: "งานเลี้ยง", outcome: "relapsed" } }, response());
  assert.equal(created.length, 2, "first relapse alerts");

  exists.mock.mockImplementation(async () => ({ _id: "log1" }));
  created = captureNotifications();
  const res = response();
  await createRiskSituationLog({ user: { id: "p1" }, body: { situation: "งานเลี้ยง", outcome: "relapsed" } }, res);
  assert.equal(res.code, 201, "the second log is still saved");
  assert.equal(created.length, 0, "but does not page again");
});

test("a coped-with situation never alerts", async () => {
  mock.method(RiskSituationLog, "create", async (data) => ({ _id: "log2", ...data }));
  mock.method(RiskSituationLog, "exists", async () => assert.fail("no alert lookup needed"));
  const created = captureNotifications();
  await createRiskSituationLog({ user: { id: "p1" }, body: { situation: "งานเลี้ยง", outcome: "avoided" } }, response());
  assert.equal(created.length, 0);
});

// ---------- ถอนการยืนยัน ----------

const tokenFor = (id = "u1") => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1h" });

async function authenticate(user) {
  mock.method(User, "findById", () => chainable(user));
  const res = response();
  let passed = false;
  await verifyToken({ headers: { authorization: `Bearer ${tokenFor()}` }, cookies: {} }, res, () => { passed = true; });
  return { res, passed };
}

test("a counsellor or admin whose verification was withdrawn is turned away", async () => {
  for (const role of ["counsellor", "admin"]) {
    const { res, passed } = await authenticate({ role, verifiedStatus: "rejected" });
    assert.equal(passed, false, role);
    assert.equal(res.code, 403, role);
    mock.restoreAll();
  }
});

test("staff accounts that are verified, or legacy accounts still marked pending, keep working", async () => {
  for (const status of ["verified", "pending"]) {
    const { passed } = await authenticate({ role: "counsellor", verifiedStatus: status });
    assert.equal(passed, true, status);
    mock.restoreAll();
  }
});

// ---------- นายจ้างไม่เห็นอะไรเลยจากใบสมัครที่ถูกถอน ----------

test("an employer loses an applicant's contact details and documents once they withdraw", async () => {
  mock.method(User, "findById", () => chainable({ verifiedStatus: "verified" }));
  mock.method(Job, "find", () => chainable([{ _id: "j1" }]));
  const applicant = (extra) => ({ _id: "u1", name: "สมหญิง", email: "s@example.com", phone: "0811111111", resumeUrl: "/uploads/resumes/cv.pdf", avatarStyle: "initial", ...extra });
  const job = { _id: "j1", title: "พนักงานต้อนรับ" };
  const withdrawn = doc({ _id: "a1", status: "cancelled", job, user: applicant(), attachments: [{ name: "บัตร", url: "/uploads/application-attachments/x.png" }] });
  const active = doc({ _id: "a2", status: "pending", job, user: applicant({ _id: "u2" }), attachments: [{ name: "บัตร", url: "/uploads/application-attachments/y.png" }] });
  mock.method(Application, "find", () => chainable([withdrawn, active]));
  mock.method(JobSkill, "find", () => chainable([
    { job: "j1", skill: { _id: "s1", skillName: "สื่อสาร" } },
    { job: "j1", skill: { _id: "s2", skillName: "บริการลูกค้า" } },
  ]));
  mock.method(UserSkill, "find", () => chainable([{ user: "u2", skill: "s1" }]));

  const res = response();
  await listEmployerApplications({ query: {}, user: { id: "e1", role: "employer" } }, res);
  const [first, second] = res.body;
  assert.equal(first.user.name, "สมหญิง");
  assert.equal("email" in first.user, false);
  assert.equal("phone" in first.user, false);
  assert.equal("resumeUrl" in first.user, false);
  assert.deepEqual(first.attachments, []);
  assert.equal(second.user.email, "s@example.com", "applications that are still live are untouched");
  assert.equal(second.attachments.length, 1);
});

test("every applicant in the employer's list is scored against the posting they applied to", async () => {
  mock.method(User, "findById", () => chainable({ verifiedStatus: "verified" }));
  mock.method(Job, "find", () => chainable([{ _id: "j1" }]));
  const applicant = (id) => ({ _id: id, name: id, email: `${id}@example.com` });
  const job = { _id: "j1", title: "พนักงานต้อนรับ" };
  mock.method(Application, "find", () => chainable([
    doc({ _id: "a1", status: "pending", job, user: applicant("u1"), attachments: [] }),
    doc({ _id: "a2", status: "rejected", job, user: applicant("u2"), attachments: [] }),
  ]));
  mock.method(JobSkill, "find", () => chainable([
    { job: "j1", skill: { _id: "s1", skillName: "สื่อสาร" } },
    { job: "j1", skill: { _id: "s2", skillName: "บริการลูกค้า" } },
  ]));
  mock.method(UserSkill, "find", () => chainable([{ user: "u2", skill: "s1" }]));

  const res = response();
  await listEmployerApplications({ query: {}, user: { id: "e1", role: "employer" } }, res);
  assert.equal(res.body[0].match.score, 0);
  assert.equal(res.body[1].match.score, 50);
  assert.deepEqual(res.body[1].match.matchedSkills, ["สื่อสาร"]);
  assert.deepEqual(res.body[1].match.missingSkills, ["บริการลูกค้า"]);
});

test("an employer can only download documents of applications that were not withdrawn", async () => {
  mock.method(User, "exists", async () => null);
  mock.method(User, "findById", () => chainable({ verifiedStatus: "verified" }));
  mock.method(User, "findOne", () => chainable({ _id: "applicant" }));
  mock.method(Job, "find", () => chainable([{ _id: "j1" }]));
  const filters = [];
  mock.method(Application, "exists", async (filter) => { filters.push(filter); return filter.user === "e1" ? null : { _id: "a" }; });
  const { default: UserCourse } = await import("../src/models/UserCourse.js");
  mock.method(UserCourse, "exists", async () => null);

  assert.equal(await canDownloadFile({ id: "e1", role: "employer" }, "/uploads/resumes/cv.pdf"), true);
  const employerChecks = filters.filter((filter) => filter.job);
  assert.ok(employerChecks.length >= 1);
  for (const filter of employerChecks) assert.deepEqual(filter.status, { $ne: "cancelled" });
});

// ---------- การแก้ไขประกาศที่อนุมัติแล้ว ----------

function liveJob(extra) {
  return doc({ _id: "j1", employer: { toString: () => "e1" }, verifiedStatus: "verified", status: "open", title: "พนักงานครัว", description: "d", externalUrl: "https://ok.example", ...extra });
}

test("changing what a moderator approved sends a live posting back for review", async () => {
  const job = liveJob();
  mock.method(Job, "findById", async () => job);
  const { default: JobSkill } = await import("../src/models/JobSkill.js");
  mock.method(JobSkill, "find", () => chainable([]));
  await updateJob({ params: { id: "j1" }, body: { externalUrl: "https://phishing.example" }, user: { id: "e1", role: "employer" } }, response());
  assert.equal(job.verifiedStatus, "pending");
});

test("closing a live posting, or re-saving it unchanged, keeps it live", async () => {
  const { default: JobSkill } = await import("../src/models/JobSkill.js");
  mock.method(JobSkill, "find", () => chainable([]));
  for (const body of [{ status: "closed" }, { title: "พนักงานครัว", externalUrl: "https://ok.example" }]) {
    const job = liveJob();
    mock.method(Job, "findById", async () => job);
    await updateJob({ params: { id: "j1" }, body, user: { id: "e1", role: "employer" } }, response());
    assert.equal(job.verifiedStatus, "verified", JSON.stringify(body));
    mock.restoreAll();
    mock.method(JobSkill, "find", () => chainable([]));
  }
});

test("an admin editing a live posting does not reset its approval", async () => {
  const job = liveJob();
  mock.method(Job, "findById", async () => job);
  const { default: JobSkill } = await import("../src/models/JobSkill.js");
  mock.method(JobSkill, "find", () => chainable([]));
  await updateJob({ params: { id: "j1" }, body: { title: "แก้คำผิด" }, user: { id: "a1", role: "admin" } }, response());
  assert.equal(job.verifiedStatus, "verified");
});

// ---------- โพสต์ชุมชน: โพสต์ที่คุณมองไม่เห็นตอบ 404 ทุกที่ ----------

test("commenting, reacting and bookmarking use the same visibility as reading", async () => {
  const filters = [];
  mock.method(Post, "findOne", (filter) => { filters.push(filter); return chainable(null); });
  mock.method(Post, "findOneAndUpdate", async (filter) => { filters.push(filter); return null; });
  mock.method(SavedPost, "findOne", async () => null);
  mock.method(SavedPost, "create", async () => assert.fail("must not bookmark a hidden post"));
  const user = { id: "507f1f77bcf86cd799439011", role: "employer" };

  const comment = response();
  await addComment({ params: { id: "p1" }, body: { content: "สวัสดี" }, user }, comment);
  const like = response();
  await likePost({ params: { id: "p1" }, body: { liked: true }, user }, like);
  const save = response();
  await toggleSavePost({ params: { id: "p1" }, user }, save);

  assert.deepEqual([comment.code, like.code, save.code], [404, 404, 404]);
  for (const filter of filters) {
    assert.deepEqual(filter.needsReview, { $ne: true });
    assert.deepEqual(filter.$or, [{ visibleToRoles: { $size: 0 } }, { visibleToRoles: "employer" }]);
  }
});

test("an existing bookmark can always be removed", async () => {
  mock.method(Post, "findOne", () => chainable(null));
  mock.method(SavedPost, "findOne", async () => ({ _id: "s1" }));
  const deleted = mock.method(SavedPost, "deleteOne", async () => ({}));
  const res = response();
  await toggleSavePost({ params: { id: "p1" }, user: { id: "u1", role: "user" } }, res);
  assert.deepEqual(res.body, { savedByMe: false });
  assert.equal(deleted.mock.callCount(), 1);
});

// ---------- บทเรียนและ mass assignment ----------

test("members only open active lessons for their own audience; staff open drafts too", async () => {
  const filters = [];
  mock.method(MicroLesson, "findOne", (filter) => { filters.push(filter); return chainable(null); });
  await getMicroLesson({ params: { id: "l1" }, user: { id: "u1", role: "user" } }, response());
  await getMicroLesson({ params: { id: "l1" }, user: { id: "f1", role: "family" } }, response());
  await getMicroLesson({ params: { id: "l1" }, user: { id: "c1", role: "counsellor" } }, response());

  assert.equal(filters[0].active, true);
  assert.deepEqual(filters[0].$or, [{ audience: "user" }, { audience: { $exists: false } }]);
  assert.deepEqual({ _id: filters[1]._id, active: filters[1].active, audience: filters[1].audience }, { _id: "l1", active: true, audience: "family" });
  assert.deepEqual(filters[2], { _id: "l1" });
  // สมาชิกไม่ได้บทเรียนที่พ้นวันหมดอายุ (ถ้าไม่ตั้งวันที่แปลว่าไม่หมดอายุ) แต่เจ้าหน้าที่ยังได้
  for (const memberFilter of [filters[0], filters[1]]) {
    assert.deepEqual(memberFilter.$and[0].$or[0], { expiresAt: null });
    assert.ok(memberFilter.$and[0].$or[1].expiresAt.$gte instanceof Date);
  }
});

test("editing a lesson, a scenario or a family mission cannot rewrite who created it or any other field", async () => {
  const written = [];
  mock.method(MicroLesson, "findByIdAndUpdate", async (id, changes) => { written.push(changes); return { _id: id }; });
  mock.method(ScenarioSimulation, "findByIdAndUpdate", async (id, changes) => { written.push(changes); return { _id: id }; });
  mock.method(FamilyMission, "findByIdAndUpdate", async (id, changes) => { written.push(changes); return { _id: id }; });
  const evil = { createdBy: "someone-else", _id: "other", __v: 99 };

  await updateMicroLesson({ params: { id: "l1" }, body: { title: "ใหม่", active: false, ...evil }, user: { id: "c1" } }, response());
  await updateScenario({ params: { id: "s1" }, body: { title: "ใหม่", active: false, ...evil }, user: { id: "c1" } }, response());
  await updateFamilyMission({ params: { id: "f1" }, body: { title: "ใหม่", points: 5, ...evil }, user: { id: "a1" } }, response());

  assert.deepEqual(written, [{ title: "ใหม่", active: false }, { title: "ใหม่", active: false }, { title: "ใหม่", points: 5 }]);
});
