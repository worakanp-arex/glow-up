import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import User from "../src/models/User.js";
import PendingRegistration from "../src/models/PendingRegistration.js";
import FamilyLink from "../src/models/FamilyLink.js";
import Application from "../src/models/Application.js";
import UserCourse from "../src/models/UserCourse.js";
import Job from "../src/models/Job.js";
import Notification from "../src/models/Notification.js";
import CounsellingSession from "../src/models/CounsellingSession.js";
import Post from "../src/models/Post.js";
import Comment from "../src/models/Comment.js";
import SavedPost from "../src/models/SavedPost.js";
import Course from "../src/models/Course.js";
import { requestRegistrationOtp, verifyRegistrationOtp, login } from "../src/controllers/authController.js";
import { acceptFamilyInvite } from "../src/controllers/familyController.js";
import { applyToJob } from "../src/controllers/applicationController.js";
import { markAsRead } from "../src/controllers/notificationController.js";
import { addMessage, getSession } from "../src/controllers/counsellingController.js";
import { listUsers } from "../src/controllers/userController.js";
import { listPosts } from "../src/controllers/postController.js";
import { listCourses } from "../src/controllers/courseController.js";
import { canDownloadFile, authorizeDownload } from "../src/middleware/authorizeDownload.js";
import { verifyToken, requireRole } from "../src/middleware/authMiddleware.js";
import { socketToken } from "../src/services/socket.js";
import { insertOnce } from "../src/utils/insertOnce.js";
import { scoreSkills } from "../src/services/jobMatchService.js";
import { paginationOptions, escapeRegex } from "../src/utils/pagination.js";
import { validateEnvironment } from "../src/config/env.js";
import { sanitizeMongoOperators } from "../src/middleware/sanitizeMongoOperators.js";
import { verifyUploadedFile } from "../src/middleware/upload.js";
import { sanitizeText } from "../src/utils/sanitizeText.js";

afterEach(() => mock.restoreAll());
const response = () => ({ code: 200, body: null, headers: {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, cookie() {}, setHeader(name, value) { this.headers[name] = value; } });
// Mongoose query chains (.sort/.populate/.select/.skip/.limit) that all
// resolve to `result` when awaited, regardless of which chain methods a
// given controller happens to call.
function chainable(result) {
  const obj = { sort: () => obj, populate: () => obj, select: () => obj, skip: () => obj, limit: () => obj, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
  return obj;
}

test("pending registration stores only a hash of the password", async () => {
  mock.method(User, "findOne", async () => null);
  mock.method(PendingRegistration, "findOne", async () => null);
  let saved;
  mock.method(PendingRegistration, "findOneAndUpdate", async (_, payload) => { saved = payload; });
  mock.method(console, "log", () => {});
  const res = response();
  await requestRegistrationOtp({ body: { name: "Test", email: "new@example.com", password: "correct-horse-123", role: "user", pdpaConsent: true } }, res);
  assert.equal(res.code, 200);
  assert.equal(saved.payload.password, undefined);
  assert.ok(await bcrypt.compare("correct-horse-123", saved.passwordHash));
  assert.ok(!JSON.stringify(saved).includes("correct-horse-123"));
});
test("expired OTP cannot create a user", async () => {
  mock.method(PendingRegistration, "findOne", () => ({ select: async () => ({ _id: "pending", otpExpiresAt: new Date(0) }) }));
  const deletion = mock.method(PendingRegistration, "deleteOne", async () => ({}));
  const res = response();
  await verifyRegistrationOtp({ body: { email: "test@example.com", otp: "123456" } }, res);
  assert.equal(res.code, 400); assert.equal(deletion.mock.callCount(), 1);
});
test("incorrect password is rejected", async () => {
  mock.method(User, "findOne", () => ({ select: async () => ({ password: "hash", comparePassword: async () => false }) }));
  const res = response(); await login({ body: { email: "test@example.com", password: "wrong" } }, res);
  assert.equal(res.code, 401);
});
test("token and role checks reject unauthenticated and unauthorized requests", () => {
  const res = response(); let passed = false;
  verifyToken({ headers: {}, cookies: {} }, res, () => { passed = true; });
  assert.equal(res.code, 401); assert.equal(passed, false);
  const token = jwt.sign({ id: "user", role: "user" }, process.env.JWT_SECRET || "test-secret", { expiresIn: "1h" });
  assert.equal(socketToken({ headers: { cookie: `other=x; token=${token}` } }), token);
  requireRole("admin")({ user: { role: "user" } }, res, () => { passed = true; });
  assert.equal(res.code, 403); assert.equal(passed, false);
});
test("family invite rejects a different signed-in email before consuming the token", async () => {
  mock.method(User, "findById", () => ({ select: async () => ({ email: "wrong@example.com", role: "user" }) }));
  const find = mock.method(FamilyLink, "findOne", () => { throw new Error("must not consume"); });
  const res = response();
  await acceptFamilyInvite({ user: { id: "other" }, body: { email: "recipient@example.com", token: "secret" } }, res);
  assert.equal(res.code, 403); assert.equal(find.mock.callCount(), 0);
});
test("document owner can download their own resume", async () => {
  mock.method(User, "exists", async (filter) => filter._id === "owner" ? {} : null);
  assert.equal(await canDownloadFile({ id: "owner", role: "user" }, "/uploads/resumes/cv.pdf"), true);
});
test("unrelated users and unverified employers cannot download private documents", async () => {
  mock.method(User, "exists", async () => null);
  mock.method(UserCourse, "exists", async () => null);
  mock.method(Application, "exists", async () => null);
  mock.method(User, "findById", () => ({ select: async () => ({ verifiedStatus: "pending" }) }));
  assert.equal(await canDownloadFile({ id: "other", role: "user" }, "/uploads/resumes/cv.pdf"), false);
  assert.equal(await canDownloadFile({ id: "employer", role: "employer" }, "/uploads/resumes/cv.pdf"), false);
});
test("verified employer must own a job with an application from the document owner", async () => {
  mock.method(User, "exists", async () => null); mock.method(UserCourse, "exists", async () => null);
  mock.method(User, "findById", () => ({ select: async () => ({ verifiedStatus: "verified" }) }));
  mock.method(Job, "find", () => ({ select: async () => [{ _id: "own-job" }] }));
  mock.method(User, "findOne", () => ({ select: async () => ({ _id: "applicant" }) }));
  mock.method(Application, "exists", async (filter) => filter.user === "applicant" && filter.job?.$in.includes("own-job") ? {} : null);
  assert.equal(await canDownloadFile({ id: "employer", role: "employer" }, "/uploads/resumes/cv.pdf"), true);
});
test("path traversal is rejected before reading files", async () => {
  const res = response(); await authorizeDownload({ params: { kind: "resumes", filename: "../.env" } }, res, () => assert.fail());
  assert.equal(res.code, 404);
});
test("expired jobs cannot receive applications", async () => {
  mock.method(Job, "findById", async () => ({ status: "open", verifiedStatus: "verified", expiredAt: new Date(0) }));
  const res = response(); await applyToJob({ params: { jobId: "job" } }, res); assert.equal(res.code, 400);
});
test("duplicate applications return a conflict", async () => {
  mock.method(Job, "findById", async () => ({ _id: "job", status: "open", verifiedStatus: "verified" }));
  mock.method(Application, "findOne", async () => ({ _id: "existing" }));
  const res = response(); await applyToJob({ params: { jobId: "job" }, user: { id: "user" } }, res); assert.equal(res.code, 409);
});
test("concurrent reward insertion has one winner and handles duplicate-key races", async () => {
  let inserted = false;
  const Model = { async updateOne() { if (inserted) throw Object.assign(new Error("duplicate"), { code: 11000 }); inserted = true; return { upsertedCount: 1 }; } };
  const results = await Promise.all(Array.from({ length: 20 }, () => insertOnce(Model, { user: "a", reward: "b" })));
  assert.equal(results.filter(Boolean).length, 1);
  await assert.rejects(insertOnce({ updateOne: async () => { throw new Error("database unavailable"); } }, {}), /database unavailable/);
});
test("matching explains actual skills, deduplicates requirements, and avoids invented scores", () => {
  const skills = [{ _id: "1", skillName: "Service" }, { _id: "2", skillName: "Computer" }];
  const match = scoreSkills([...skills, skills[0]], ["1"]);
  assert.equal(match.score, 50); assert.deepEqual(match.matchedSkills, ["Service"]); assert.deepEqual(match.missingSkills, ["Computer"]);
  assert.equal(scoreSkills([], ["1"]), null); assert.equal(scoreSkills(skills, []).score, 0);
});
test("pagination is bounded and search treats regex metacharacters as text", () => {
  assert.deepEqual(paginationOptions({ page: -1, limit: 1000 }), { page: 1, limit: 50, skip: 0 });
  assert.equal(paginationOptions({}), null);
  assert.equal(new RegExp(escapeRegex("a+b [x]")).test("a+b [x]"), true);
});
test("production configuration rejects missing and weak secrets", () => {
  assert.throws(() => validateEnvironment({}), /MONGODB_URI/);
  assert.throws(() => validateEnvironment({ MONGODB_URI: "test", JWT_SECRET: "short", NODE_ENV: "production" }), /JWT_SECRET/);
  assert.doesNotThrow(() => validateEnvironment({ MONGODB_URI: "test", JWT_SECRET: "development-secret" }));
});
test("deleted accounts cannot use a previously valid token", async () => {
  mock.method(User, "findById", () => ({ select: async () => null }));
  const token = jwt.sign({ id: "deleted", role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const res = response();
  await verifyToken({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail("deleted account passed"));
  assert.equal(res.code, 401);
});
test("authorization uses the current role instead of a stale token role", async () => {
  mock.method(User, "findById", () => ({ select: async () => ({ role: "user" }) }));
  const token = jwt.sign({ id: "demoted", role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const req = { headers: { authorization: `Bearer ${token}` } }, res = response();
  await verifyToken(req, res, () => {});
  requireRole("admin")(req, res, () => assert.fail("stale role passed"));
  assert.equal(res.code, 403);
});
test("Mongo operator keys are stripped from query, body, and params before reaching controllers", () => {
  const req = {
    query: { role: { $ne: "admin" }, plain: "ok" },
    body: { "a.b": "nested-dot-key", nested: { $where: "1==1", safe: "value" } },
    params: { id: "abc" },
  };
  sanitizeMongoOperators(req, {}, () => {});
  assert.deepEqual(req.query, { role: {}, plain: "ok" });
  assert.deepEqual(req.body, { nested: { safe: "value" } });
  assert.deepEqual(req.params, { id: "abc" });
});
test("uploaded file content that doesn't match its declared kind is rejected and deleted", async () => {
  const filePath = path.join(os.tmpdir(), `${randomUUID()}.bin`);
  fs.writeFileSync(filePath, "this is plain text, not an image");
  const res = response();
  await verifyUploadedFile("avatar")({ file: { path: filePath } }, res, () => assert.fail("should not call next"));
  assert.equal(res.code, 400);
  assert.equal(fs.existsSync(filePath), false);
});
test("uploaded file content matching its declared kind is accepted", async () => {
  const filePath = path.join(os.tmpdir(), `${randomUUID()}.jpg`);
  fs.writeFileSync(filePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]));
  let passed = false;
  await verifyUploadedFile("avatar")({ file: { path: filePath } }, response(), () => { passed = true; });
  assert.equal(passed, true);
  fs.rmSync(filePath, { force: true });
});
test("legacy .doc content (generic OLE container) is accepted where application/msword is allowed", async () => {
  const filePath = path.join(os.tmpdir(), `${randomUUID()}.doc`);
  fs.writeFileSync(filePath, Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]));
  let passed = false;
  await verifyUploadedFile("resume")({ file: { path: filePath } }, response(), () => { passed = true; });
  assert.equal(passed, true);
  fs.rmSync(filePath, { force: true });
});
test("post and comment content is stripped of markup before saving", () => {
  const cleaned = sanitizeText('hello <script>alert(1)</script> world');
  assert.ok(!cleaned.includes("<script"));
  assert.ok(!cleaned.includes("alert(1)"), "script tag content should be discarded, not just unwrapped");
  assert.equal(sanitizeText('<img src=x onerror=alert(1)><b>bold</b> text'), "bold text");
  assert.equal(sanitizeText("  plain text  "), "plain text");
});
test("marking a notification as read is scoped to the signed-in owner", async () => {
  const update = mock.method(Notification, "findOneAndUpdate", async (filter) => (filter.user === "owner" ? { _id: filter._id, status: "read" } : null));
  const res = response();
  await markAsRead({ params: { id: "note1" }, user: { id: "attacker" } }, res);
  assert.equal(res.code, 404);
  assert.equal(update.mock.calls[0].arguments[0].user, "attacker");
});
test("counselling session access is restricted to the patient, assigned counsellor, or admin", async () => {
  mock.method(CounsellingSession, "findById", () => ({ user: "patient", counsellor: "assigned-counsellor", messages: [], save: async () => {} }));
  const res = response();
  await addMessage({ params: { id: "session1" }, body: { content: "hi" }, user: { id: "stranger", role: "user" } }, res);
  assert.equal(res.code, 403);
});
test("family accept and link-summary routes require a user or family role", () => {
  const res = response();
  requireRole("user", "family")({ user: { role: "employer" } }, res, () => assert.fail("employer should not pass"));
  assert.equal(res.code, 403);
  let passed = false;
  requireRole("user", "family")({ user: { role: "family" } }, res, () => { passed = true; });
  assert.equal(passed, true);
});
test("listUsers only paginates when a page is requested, and sets X-Total-Count", async () => {
  const find = mock.method(User, "find", () => chainable([{ _id: "u1" }]));
  mock.method(User, "countDocuments", async () => 137);
  const unpaged = response();
  await listUsers({ query: {} }, unpaged);
  assert.equal(unpaged.headers["X-Total-Count"], undefined);

  const paged = response();
  await listUsers({ query: { page: "2", limit: "10" } }, paged);
  assert.equal(paged.headers["X-Total-Count"], 137);
  assert.equal(find.mock.callCount(), 2);
});
test("listPosts sets X-Total-Count only when paginated", async () => {
  mock.method(Post, "find", () => chainable([{ _id: "p1", likedBy: [] }]));
  mock.method(Post, "countDocuments", async () => 42);
  mock.method(SavedPost, "find", () => chainable([]));
  mock.method(Comment, "countDocuments", async () => 0);

  const unpaged = response();
  await listPosts({ query: {}, user: { id: "u1" } }, unpaged);
  assert.equal(unpaged.headers["X-Total-Count"], undefined);

  const paged = response();
  await listPosts({ query: { page: "1" }, user: { id: "u1" } }, paged);
  assert.equal(paged.headers["X-Total-Count"], 42);
});
test("course search escapes regex metacharacters instead of building a raw RegExp from user input", async () => {
  let capturedFilter;
  mock.method(Course, "find", (filter) => { capturedFilter = filter; return chainable([]); });
  mock.method(Course, "countDocuments", async () => 0);
  await listCourses({ query: { q: "a+b(.*)" } }, response());
  assert.ok(capturedFilter.$or[0].title.test("a+b(.*)"), "escaped pattern should still match the literal text");
  assert.equal(capturedFilter.$or[0].title.test("aaab"), false, "unescaped metacharacters must not be interpreted as regex");
});
test("production configuration requires SMTP settings", () => {
  assert.throws(
    () => validateEnvironment({ MONGODB_URI: "test", JWT_SECRET: "x".repeat(32), NODE_ENV: "production" }),
    /SMTP/
  );
  assert.doesNotThrow(() =>
    validateEnvironment({
      MONGODB_URI: "test",
      JWT_SECRET: "x".repeat(32),
      NODE_ENV: "production",
      SMTP_HOST: "smtp.example.com",
      SMTP_USER: "user",
      SMTP_PASS: "pass",
    })
  );
});
