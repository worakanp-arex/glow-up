import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import User from "../src/models/User.js";
import Job from "../src/models/Job.js";
import JobSkill from "../src/models/JobSkill.js";
import Skill from "../src/models/Skill.js";
import Post from "../src/models/Post.js";
import Comment from "../src/models/Comment.js";
import SavedPost from "../src/models/SavedPost.js";
import Course from "../src/models/Course.js";
import UserCourse from "../src/models/UserCourse.js";
import FamilyLink from "../src/models/FamilyLink.js";
import FamilyMessage from "../src/models/FamilyMessage.js";
import Notification from "../src/models/Notification.js";
import CounsellingSession from "../src/models/CounsellingSession.js";
import { createSession, cancelMySession, claimSession, addMessage } from "../src/controllers/counsellingController.js";
import { flagPostForReview, clearPostFlag, deletePost, listPosts } from "../src/controllers/postController.js";
import {
  requestFamilyLink,
  respondToFamilyRequest,
  sendEncouragementMessage,
  markFamilyMessageRead,
} from "../src/controllers/familyController.js";
import { listCourses, createCourse, enrollCourse } from "../src/controllers/courseController.js";
import { sendCourseExpiryReminders } from "../src/services/courseReminderService.js";
import { sendContentExpiryReminders } from "../src/services/contentReminderService.js";
import MicroLesson from "../src/models/MicroLesson.js";
import ScenarioSimulation from "../src/models/ScenarioSimulation.js";
import { updateMe, deleteUser, verifyUser, createUserByAdmin } from "../src/controllers/userController.js";
import { confirmJob, updateJob, getMyJob } from "../src/controllers/jobController.js";
import { ensureDefaultSkills } from "../src/services/skillCatalogService.js";
import { getOverviewUsers } from "../src/controllers/overviewController.js";
import { DEFAULT_SKILLS } from "../src/constants/skills.js";

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

// Mongoose query chain that resolves to `result` whichever chain methods are used.
function chainable(result) {
  const obj = { sort: () => obj, populate: () => obj, select: () => obj, skip: () => obj, limit: () => obj, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
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

// ---------- counselling: one request at a time ----------

test("a person with a request in progress cannot open another one", async () => {
  mock.method(CounsellingSession, "findOne", () => chainable({ _id: "open1" }));
  const create = mock.method(CounsellingSession, "create", async () => assert.fail("must not create a second request"));
  const res = response();
  await createSession({ user: { id: "u1" }, body: { sessionType: "chat", topic: "t", message: "m", mood: "sad", preferredAt: new Date().toISOString() } }, res);
  assert.equal(res.code, 409);
  assert.equal(res.body.sessionId, "open1");
  assert.equal(create.mock.callCount(), 0);
});

test("a new request is created once the previous one is finished", async () => {
  let filter;
  mock.method(CounsellingSession, "findOne", (f) => { filter = f; return chainable(null); });
  mock.method(CounsellingSession, "create", async (data) => ({ _id: "s2", ...data }));
  const res = response();
  await createSession({ user: { id: "u1" }, body: { sessionType: "chat", topic: "t", message: "m", mood: "sad", preferredAt: new Date().toISOString() } }, res);
  assert.equal(res.code, 201);
  assert.deepEqual(filter, { user: "u1", status: { $in: ["pending", "active", "scheduled"] } });
});

test("the owner can cancel an open request and the counsellor is told", async () => {
  let filter;
  const session = { _id: "s1", topic: "ความเครียด", status: "cancelled", user: { _id: "u1", name: "ก้าวใหม่" }, counsellor: { _id: "c1" } };
  const chain = { populate: () => chain, then: (resolve) => Promise.resolve(session).then(resolve) };
  mock.method(CounsellingSession, "findOneAndUpdate", (f) => { filter = f; return chain; });
  const created = captureNotifications();
  const res = response();
  await cancelMySession({ params: { id: "s1" }, user: { id: "u1", role: "user" } }, res);
  assert.equal(res.body.status, "cancelled");
  assert.deepEqual(filter.status, { $in: ["pending", "active", "scheduled"] });
  assert.equal(filter.user, "u1");
  assert.equal(created.length, 1);
  assert.equal(String(created[0].user), "c1");
});

test("cancelling a request that is already finished is rejected", async () => {
  const chain = { populate: () => chain, then: (resolve) => Promise.resolve(null).then(resolve) };
  mock.method(CounsellingSession, "findOneAndUpdate", () => chain);
  mock.method(CounsellingSession, "exists", async () => true);
  const res = response();
  await cancelMySession({ params: { id: "s1" }, user: { id: "u1", role: "user" } }, res);
  assert.equal(res.code, 409);
});

test("only a pending, unclaimed request can be claimed", async () => {
  let filter;
  const chain = { populate: () => chain, then: (resolve) => Promise.resolve(null).then(resolve) };
  mock.method(CounsellingSession, "findOneAndUpdate", (f) => { filter = f; return chain; });
  mock.method(CounsellingSession, "exists", async () => true);
  const res = response();
  await claimSession({ params: { id: "s1" }, user: { id: "c1", role: "counsellor" } }, res);
  assert.deepEqual(filter, { _id: "s1", counsellor: null, status: "pending" });
  assert.equal(res.code, 409);
});

test("messages cannot be added to a closed request, but sessions without a status still work", async () => {
  mock.method(CounsellingSession, "findById", async () => ({ user: "u1", status: "closed", messages: [] }));
  const closed = response();
  await addMessage({ params: { id: "s1" }, body: { content: "hi" }, user: { id: "u1", role: "user" } }, closed);
  assert.equal(closed.code, 409);

  mock.restoreAll();
  const open = doc({ user: "u1", counsellor: null, topic: "t", messages: { push() {} } });
  mock.method(CounsellingSession, "findById", async () => open);
  const res = response();
  await addMessage({ params: { id: "s1" }, body: { content: "hi" }, user: { id: "u1", role: "user" } }, res);
  assert.equal(res.code, 201);
});

// ---------- post reports ----------

test("reporting a post stores the reason, hides it and alerts the staff", async () => {
  mock.method(Post, "countDocuments", async () => 0);
  mock.method(Post, "findOne", async () => ({ _id: "p1", user: { toString: () => "author" } }));
  let update;
  mock.method(Post, "findOneAndUpdate", async (filter, change) => { update = { filter, change }; return { _id: "p1" }; });
  mock.method(User, "find", () => chainable([{ _id: "s1" }, { _id: "s2" }]));
  const created = captureNotifications();
  const res = response();
  await flagPostForReview({ params: { id: "p1" }, body: { reason: "harassment", detail: "ถ้อยคำรุนแรง" }, user: { id: "reporter", role: "user" } }, res);
  assert.equal(res.body.reportedByMe, true);
  assert.equal(update.change.$push.reports.reason, "harassment");
  assert.equal(update.change.$set.needsReview, true);
  assert.deepEqual(update.filter["reports.reporter"], { $ne: "reporter" });
  assert.deepEqual(created.map((n) => n.type), ["report", "report"]);
});

test("an unknown report reason falls back to 'other' and own posts cannot be reported", async () => {
  mock.method(Post, "countDocuments", async () => 0);
  mock.method(Post, "findOne", async () => ({ _id: "p1", user: { toString: () => "author" } }));
  let update;
  mock.method(Post, "findOneAndUpdate", async (filter, change) => { update = change; return { _id: "p1" }; });
  mock.method(User, "find", () => chainable([]));
  await flagPostForReview({ params: { id: "p1" }, body: { reason: "not-a-reason" }, user: { id: "reporter", role: "user" } }, response());
  assert.equal(update.$push.reports.reason, "other");

  const own = response();
  await flagPostForReview({ params: { id: "p1" }, body: { reason: "spam" }, user: { id: "author", role: "counsellor" } }, own);
  assert.equal(own.code, 400);
});

test("a repeat report from the same person does not alert staff again", async () => {
  mock.method(Post, "countDocuments", async () => 0);
  mock.method(Post, "findOne", async () => ({ _id: "p1", user: { toString: () => "author" } }));
  mock.method(Post, "findOneAndUpdate", async () => null);
  const created = captureNotifications();
  const res = response();
  await flagPostForReview({ params: { id: "p1" }, body: { reason: "spam" }, user: { id: "reporter", role: "user" } }, res);
  assert.equal(created.length, 0);
  assert.equal(res.body.reportedByMe, true);
});

test("resolving a report shows the post again and tells every reporter", async () => {
  const post = doc({ _id: "p1", needsReview: true, reports: [{ reporter: "r1" }, { reporter: "r2" }, { reporter: "r1" }] });
  mock.method(Post, "findById", async () => post);
  const created = captureNotifications();
  const res = response();
  await clearPostFlag({ params: { id: "p1" }, body: { note: "ไม่พบการละเมิด" }, user: { id: "s1", role: "counsellor" } }, res);
  assert.equal(post.needsReview, false);
  assert.deepEqual(post.reports, []);
  assert.equal(post.lastReview.action, "kept");
  assert.deepEqual(created.map((n) => String(n.user)).sort(), ["r1", "r2"]);
  assert.ok(created.every((n) => n.type === "moderation"));
});

test("reported posts are hidden from ordinary readers but not from staff", async () => {
  const filters = [];
  mock.method(Post, "find", (filter) => { filters.push(filter); return chainable([]); });
  mock.method(Post, "countDocuments", async () => 0);
  mock.method(SavedPost, "find", () => chainable([]));
  await listPosts({ query: {}, user: { id: "u1", role: "user" } }, response());
  await listPosts({ query: {}, user: { id: "s1", role: "counsellor" } }, response());
  assert.deepEqual(filters[0].needsReview, { $ne: true });
  assert.equal("needsReview" in filters[1], false);
});

test("staff may delete a reported post written by someone else, and the reporters are told", async () => {
  const post = { _id: "p1", user: { toString: () => "author" }, needsReview: true, reports: [{ reporter: "r1" }] };
  mock.method(Post, "findById", async () => post);
  const removed = mock.method(Post, "findByIdAndDelete", async () => post);
  mock.method(Comment, "deleteMany", async () => ({}));
  mock.method(SavedPost, "deleteMany", async () => ({}));
  const created = captureNotifications();
  await deletePost({ params: { id: "p1" }, user: { id: "s2", role: "counsellor" } }, response());
  assert.equal(removed.mock.callCount(), 1);
  assert.ok(created.some((n) => String(n.user) === "r1" && n.type === "moderation"));
  assert.ok(created.some((n) => String(n.user) === "author"));
});

test("staff cannot delete someone else's post that was never reported", async () => {
  mock.method(Post, "findById", async () => ({ _id: "p1", user: { toString: () => "author" }, needsReview: false, reports: [] }));
  const res = response();
  await deletePost({ params: { id: "p1" }, user: { id: "s2", role: "counsellor" } }, res);
  assert.equal(res.code, 403);
});

// ---------- family: requests and messages ----------

test("a family request always gets the same answer, so patient emails cannot be probed", async () => {
  mock.method(User, "findById", () => chainable({ _id: "fam1", name: "แม่", email: "mom@example.com", role: "family" }));
  mock.method(User, "findOne", () => chainable(null));
  const create = mock.method(FamilyLink, "create", async () => assert.fail("no link for an unknown email"));
  const res = response();
  await requestFamilyLink({ body: { email: "nobody@example.com" }, user: { id: "fam1" } }, res);
  assert.equal(res.code, 202);
  assert.deepEqual(res.body, { sent: true });
  assert.equal(create.mock.callCount(), 0);
});

test("a family request for a real patient creates a pending request and notifies them", async () => {
  mock.method(User, "findById", () => chainable({ _id: "fam1", name: "แม่", email: "mom@example.com", role: "family" }));
  mock.method(User, "findOne", () => chainable({ _id: "patient1", name: "ก้าวใหม่" }));
  mock.method(FamilyLink, "findOne", async () => null);
  let link;
  mock.method(FamilyLink, "create", async (data) => { link = data; return data; });
  const created = captureNotifications();
  const res = response();
  await requestFamilyLink({ body: { email: "patient@example.com" }, user: { id: "fam1" } }, res);
  assert.equal(res.code, 202);
  assert.equal(link.status, "requested");
  assert.equal(link.initiatedBy, "family");
  assert.equal(String(link.recoveringUser), "patient1");
  assert.equal(created[0].type, "familyRequest");
});

test("the patient approves a request and the family member is told", async () => {
  const link = doc({ _id: "link1", recoveringUser: "patient1", familyUser: "fam1", status: "requested" });
  mock.method(FamilyLink, "findOne", async () => link);
  mock.method(FamilyLink, "exists", async () => null);
  mock.method(User, "findById", () => chainable({ name: "ก้าวใหม่" }));
  const created = captureNotifications();
  const res = response();
  await respondToFamilyRequest({ params: { id: "link1" }, body: { approve: true }, user: { id: "patient1" } }, res);
  assert.equal(link.status, "active");
  assert.equal(String(created[0].user), "fam1");
});

test("a request cannot be approved while another family member is already connected", async () => {
  mock.method(FamilyLink, "findOne", async () => doc({ _id: "link1", recoveringUser: "patient1", familyUser: "fam1", status: "requested" }));
  mock.method(FamilyLink, "exists", async () => ({ _id: "other" }));
  mock.method(User, "findById", () => chainable({ name: "ก้าวใหม่" }));
  const res = response();
  await respondToFamilyRequest({ params: { id: "link1" }, body: { approve: true }, user: { id: "patient1" } }, res);
  assert.equal(res.code, 409);
});

test("declining a request revokes it", async () => {
  const link = doc({ _id: "link1", recoveringUser: "patient1", familyUser: "fam1", status: "requested" });
  mock.method(FamilyLink, "findOne", async () => link);
  mock.method(User, "findById", () => chainable({ name: "ก้าวใหม่" }));
  captureNotifications();
  await respondToFamilyRequest({ params: { id: "link1" }, body: { approve: false }, user: { id: "patient1" } }, response());
  assert.equal(link.status, "revoked");
});

test("the person in recovery can reply to their family, and it is stored on the link", async () => {
  mock.method(FamilyLink, "findById", async () => ({ _id: "link1", status: "active", familyUser: "fam1", recoveringUser: "user1" }));
  mock.method(User, "findById", () => chainable({ name: "ก้าวใหม่" }));
  mock.method(FamilyMessage, "findOne", () => chainable({ _id: "m0" }));
  let stored;
  mock.method(FamilyMessage, "create", async (data) => { stored = data; return { _id: "m1", ...data }; });
  const created = captureNotifications();
  const res = response();
  await sendEncouragementMessage({ params: { linkId: "link1" }, body: { message: "ขอบคุณนะ", replyTo: "m0" }, user: { id: "user1", role: "user" } }, res);
  assert.equal(res.code, 201);
  assert.equal(stored.senderRole, "user");
  assert.equal(String(stored.replyTo), "m0");
  assert.equal(String(created[0].user), "fam1");
});

test("a stranger cannot post to a family link, and a sender cannot mark their own message read", async () => {
  mock.method(FamilyLink, "findById", async () => ({ _id: "link1", status: "active", familyUser: "fam1", recoveringUser: "user1" }));
  const res = response();
  await sendEncouragementMessage({ params: { linkId: "link1" }, body: { message: "hi" }, user: { id: "intruder", role: "user" } }, res);
  assert.equal(res.code, 403);

  mock.method(FamilyMessage, "findById", async () => ({ _id: "m1", familyLink: "link1", sender: { toString: () => "fam1" } }));
  const own = response();
  await markFamilyMessageRead({ params: { id: "m1" }, user: { id: "fam1", role: "family" } }, own);
  assert.equal(own.code, 403);
});

// ---------- courses: open and expiry dates ----------

test("course list can be narrowed to open, upcoming or expired courses without touching the search filter", async () => {
  const filters = [];
  mock.method(Course, "find", (filter) => { filters.push(filter); return chainable([]); });
  await listCourses({ query: { status: "expired", q: "ทักษะ" } }, response());
  await listCourses({ query: { status: "active" } }, response());
  await listCourses({ query: {} }, response());
  assert.ok(filters[0].$and[0].endDate.$lt instanceof Date);
  assert.ok(filters[0].$or[0].title instanceof RegExp);
  assert.equal(filters[1].$and.length, 2);
  assert.equal("$and" in filters[2], false);
});

test("course dates are stored as Bangkok day boundaries", async () => {
  let stored;
  mock.method(Course, "create", async (data) => { stored = data; return data; });
  await createCourse({ user: { id: "s1" }, body: { title: "คอร์ส", externalUrl: "https://example.com", startDate: "2026-09-01", endDate: "2026-09-30", coverImage: "/images/lessons/cover-2.png" } }, response());
  assert.equal(stored.startDate.toISOString(), "2026-08-31T17:00:00.000Z");
  assert.equal(stored.endDate.toISOString(), "2026-09-30T16:59:59.999Z");
  assert.equal(stored.coverImage, "/images/lessons/cover-2.png");
});

test("an expired course cannot be saved", async () => {
  mock.method(Course, "findById", async () => ({ _id: "c1", endDate: new Date(Date.now() - 1000) }));
  const res = response();
  await enrollCourse({ params: { id: "c1" }, user: { id: "u1" } }, res);
  assert.equal(res.code, 409);
});

test("course expiry reminders go to people who saved the course, once per day", async () => {
  const soon = new Date(Date.now() + 36 * 60 * 60 * 1000);
  mock.method(Course, "find", () => chainable([{ _id: "c1", title: "ทักษะอาชีพ", endDate: soon }]));
  mock.method(UserCourse, "find", () => chainable([{ user: "u1", course: "c1" }, { user: "u2", course: "c1" }]));
  const already = new Set(["u2"]);
  mock.method(Notification, "exists", async (filter) => (already.has(String(filter.user)) ? { _id: "n" } : null));
  const created = captureNotifications();
  const sent = await sendCourseExpiryReminders();
  assert.equal(sent, 1);
  assert.equal(String(created[0].user), "u1");
  assert.equal(created[0].type, "courseExpiry");
  assert.equal(created[0].link, "/courses/c1");
});

test("the staff member who wrote a lesson or scenario is reminded before it expires, once per day", async () => {
  const soon = new Date(Date.now() + 36 * 60 * 60 * 1000);
  mock.method(MicroLesson, "find", () => chainable([{ _id: "l1", title: "ปฏิเสธเพื่อน", expiresAt: soon, createdBy: "c1" }]));
  mock.method(ScenarioSimulation, "find", () => chainable([
    { _id: "s1", title: "งานเลี้ยง", expiresAt: soon, createdBy: "c1" },
    { _id: "s2", title: "ไม่มีผู้เขียน", expiresAt: soon },
  ]));
  const already = new Set();
  mock.method(Notification, "exists", async (filter) => (already.has(filter.message) ? { _id: "n" } : null));
  const created = captureNotifications();

  assert.equal(await sendContentExpiryReminders(), 2);
  assert.deepEqual(created.map((item) => item.type), ["contentExpiry", "contentExpiry"]);
  assert.match(created[0].message, /บทเรียน "ปฏิเสธเพื่อน" จะหมดอายุ/);
  assert.match(created[1].message, /สถานการณ์จำลอง "งานเลี้ยง" จะหมดอายุ/);
  assert.equal(created[0].link, "/counsellor/lessons");

  created.length = 0;
  already.add(`บทเรียน "ปฏิเสธเพื่อน" จะหมดอายุในอีก 2 วัน ต่ออายุหรือแก้ไขได้ที่หน้าจัดการทักษะการปฏิเสธ`);
  assert.equal(await sendContentExpiryReminders(), 1, "an item already reminded about today is skipped");
});

// ---------- accounts: admin guards and profile art ----------

test("an admin cannot delete themselves or the last active admin", async () => {
  const self = response();
  await deleteUser({ params: { id: "admin1" }, user: { id: "admin1" } }, self);
  assert.equal(self.code, 400);

  mock.method(User, "findById", () => chainable({ _id: "admin2", role: "admin" }));
  mock.method(User, "countDocuments", async () => 0);
  const last = response();
  await deleteUser({ params: { id: "admin2" }, user: { id: "admin1" } }, last);
  assert.equal(last.code, 400);
});

test("rejecting an account saves the reason and includes it in the notification", async () => {
  mock.method(User, "findById", () => chainable({ _id: "emp1", role: "employer" }));
  let update;
  mock.method(User, "findByIdAndUpdate", async (id, change) => { update = change; return { _id: "emp1" }; });
  const created = captureNotifications();
  await verifyUser({ params: { id: "emp1" }, body: { status: "rejected", reason: "เลขผู้เสียภาษีไม่ตรง" }, user: { id: "admin1" } }, response());
  assert.equal(update.verifiedStatus, "rejected");
  assert.equal(update.verificationNote, "เลขผู้เสียภาษีไม่ตรง");
  assert.match(created[0].message, /เหตุผล: เลขผู้เสียภาษีไม่ตรง/);
});

test("admin-created accounts follow the same password policy as everyone else", async () => {
  // Staff accounts can read patient records, so a short or obvious password is refused.
  for (const password of ["short", "Abcdefg12", "password123", "aaaaaaaaaaaa"]) {
    const res = response();
    await createUserByAdmin({ body: { name: "แอดมิน", email: "a@example.com", password, role: "admin" } }, res);
    assert.equal(res.code, 400, password);
  }
});

test("profile pictures and covers are picked from fixed keys and never from arbitrary URLs", async () => {
  mock.method(User, "findById", () => chainable({ avatarUrl: "/uploads/avatars/old.webp" }));
  let update;
  mock.method(User, "findByIdAndUpdate", async (id, change) => { update = change; return { _id: id }; });
  await updateMe({ user: { id: "u1" }, body: { avatarPreset: "mascot", avatarUrl: "https://evil.example/x.png", coverPreset: "ocean", familyName: "บ้านสุขใจ" } }, response());
  assert.equal(update.avatarUrl, "/images/illustrations/mascot.webp");
  assert.equal(update.avatarStyle, "image");
  assert.equal(update.coverPreset, "ocean");
  assert.equal(update.familyName, "บ้านสุขใจ");

  await updateMe({ user: { id: "u1" }, body: { avatarPreset: "../../etc/passwd", coverPreset: "nope", avatarStyle: "initial", avatarColor: "red" } }, response());
  assert.equal("avatarUrl" in update, false);
  assert.equal("coverPreset" in update, false);
  assert.equal(update.avatarStyle, "initial");
  assert.equal("avatarColor" in update, false);
});

// ---------- jobs: moderation reasons and edits ----------

test("rejecting a job keeps the reason for the employer", async () => {
  let update;
  mock.method(Job, "findByIdAndUpdate", async (id, change) => { update = change; return doc({ _id: "j1", title: "พนักงานครัว", employer: "e1" }); });
  mock.method(JobSkill, "find", () => chainable([]));
  const created = captureNotifications();
  await confirmJob({ params: { id: "j1" }, body: { status: "rejected", reason: "ไม่ระบุเงินเดือน" }, user: { id: "admin1" } }, response());
  assert.equal(update.verifiedStatus, "rejected");
  assert.equal(update.rejectionReason, "ไม่ระบุเงินเดือน");
  assert.match(created[0].message, /ไม่ระบุเงินเดือน/);
  assert.equal(created[0].link, "/employer/jobs/j1");
});

test("editing a rejected posting sends it back for review, and blank inputs clear optional fields", async () => {
  const job = doc({ _id: "j1", employer: { toString: () => "e1" }, verifiedStatus: "rejected", rejectionReason: "x", externalUrl: "https://old.example", title: "t" });
  mock.method(Job, "findById", async () => job);
  mock.method(JobSkill, "find", () => chainable([]));
  await updateJob({ params: { id: "j1" }, body: { title: "ชื่อใหม่", externalUrl: "" }, user: { id: "e1", role: "employer" } }, response());
  assert.equal(job.verifiedStatus, "pending");
  assert.equal(job.rejectionReason, undefined);
  assert.equal(job.externalUrl, undefined);
  assert.equal(job.title, "ชื่อใหม่");
});

test("an employer only opens their own postings", async () => {
  let filter;
  mock.method(Job, "findOne", (f) => { filter = f; return chainable(null); });
  const res = response();
  await getMyJob({ params: { id: "j1" }, user: { id: "e1", role: "employer" } }, res);
  assert.deepEqual(filter, { _id: "j1", employer: "e1" });
  assert.equal(res.code, 404);
});

// ---------- overview: who is behind a number ----------

test("admins get risk numbers only, never a per-person risk list", async () => {
  const res = response();
  await getOverviewUsers({ query: { kind: "risk" }, user: { id: "admin1", role: "admin" } }, res);
  assert.equal(res.code, 403);
});

test("an unknown overview list kind is rejected", async () => {
  const res = response();
  await getOverviewUsers({ query: { kind: "everything" }, user: { id: "c1", role: "counsellor" } }, res);
  assert.equal(res.code, 400);
});

// ---------- skills catalogue ----------

test("the default skills are added once and never overwrite existing ones", async () => {
  const first = DEFAULT_SKILLS.service[0];
  mock.method(Skill, "find", () => chainable([
    { _id: "s1", skillName: first, category: "service" },
    { _id: "s2", skillName: DEFAULT_SKILLS["soft-skill"][0] },
  ]));
  const inserted = [];
  mock.method(Skill, "insertMany", async (rows) => { inserted.push(...rows); return rows; });
  const updates = [];
  mock.method(Skill, "updateOne", async (filter, change) => { updates.push({ filter, change }); });
  const result = await ensureDefaultSkills();
  const total = Object.values(DEFAULT_SKILLS).flat().length;
  assert.equal(inserted.length, total - 2);
  assert.equal(result.added, total - 2);
  assert.equal(inserted.some((row) => row.skillName === first), false);
  assert.deepEqual(updates, [{ filter: { _id: "s2" }, change: { category: "soft-skill" } }]);
});
