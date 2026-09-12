import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import PendingRegistration from "../src/models/PendingRegistration.js";
import FamilyLink from "../src/models/FamilyLink.js";
import Application from "../src/models/Application.js";
import UserCourse from "../src/models/UserCourse.js";
import Job from "../src/models/Job.js";
import { requestRegistrationOtp, verifyRegistrationOtp, login } from "../src/controllers/authController.js";
import { acceptFamilyInvite } from "../src/controllers/familyController.js";
import { applyToJob } from "../src/controllers/applicationController.js";
import { canDownloadFile, authorizeDownload } from "../src/middleware/authorizeDownload.js";
import { verifyToken, requireRole } from "../src/middleware/authMiddleware.js";
import { socketToken } from "../src/services/socket.js";
import { insertOnce } from "../src/utils/insertOnce.js";
import { scoreSkills } from "../src/services/jobMatchService.js";
import { paginationOptions, escapeRegex } from "../src/utils/pagination.js";
import { validateEnvironment } from "../src/config/env.js";

afterEach(() => mock.restoreAll());
const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, cookie() {} });

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
