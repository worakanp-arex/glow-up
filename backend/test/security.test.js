import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
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
import { verifyUploadedFile, discardUploadsOnFailure } from "../src/middleware/upload.js";
import { sanitizeText } from "../src/utils/sanitizeText.js";
import sharp from "sharp";

afterEach(() => mock.restoreAll());
// Registration looks accounts up including deleted ones (their address stays reserved).
const accountLookup = (found) => () => ({ setOptions: async () => found });
const response = () => ({ code: 200, body: null, headers: {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, cookie() {}, setHeader(name, value) { this.headers[name] = value; } });
// Mongoose query chains (.sort/.populate/.select/.skip/.limit) that all
// resolve to `result` when awaited, regardless of which chain methods a
// given controller happens to call.
function chainable(result) {
  const obj = { sort: () => obj, populate: () => obj, select: () => obj, skip: () => obj, limit: () => obj, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
  return obj;
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
test("pending registration stores only hashes: of the password and of the secret handed to the browser", async () => {
  mock.method(User, "findOne", accountLookup(null));
  mock.method(PendingRegistration, "findOne", () => ({ select: async () => null }));
  let saved;
  mock.method(PendingRegistration, "findOneAndUpdate", async (_, payload) => { saved = payload; });
  mock.method(console, "log", () => {});
  const res = response();
  await requestRegistrationOtp({ body: { name: "Test", email: "new@example.com", password: "correct-horse-123", role: "user", pdpaConsent: true } }, res);
  assert.equal(res.code, 200);
  assert.equal(saved.payload.password, undefined);
  assert.ok(await bcrypt.compare("correct-horse-123", saved.passwordHash));
  assert.ok(!JSON.stringify(saved).includes("correct-horse-123"));
  assert.match(res.body.registrationToken, /^[0-9a-f]{64}$/);
  assert.equal(saved.registrationTokenHash, sha256(res.body.registrationToken));
  assert.ok(!JSON.stringify(saved).includes(res.body.registrationToken), "the raw secret is never stored");
});
test("expired OTP cannot create a user", async () => {
  mock.method(PendingRegistration, "findOne", () => ({ select: async () => ({ _id: "pending", otpExpiresAt: new Date(0), registrationTokenHash: sha256("a".repeat(64)) }) }));
  const deletion = mock.method(PendingRegistration, "deleteOne", async () => ({}));
  const res = response();
  await verifyRegistrationOtp({ body: { email: "test@example.com", otp: "123456", registrationToken: "a".repeat(64) } }, res);
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
const verifiedApplicant = () => mock.method(User, "findById", () => ({ select: async () => ({ verifiedStatus: "verified" }) }));
test("unverified job seekers cannot apply", async () => {
  mock.method(User, "findById", () => ({ select: async () => ({ verifiedStatus: "pending" }) }));
  const findJob = mock.method(Job, "findById", async () => ({ _id: "job", status: "open", verifiedStatus: "verified" }));
  const res = response(); await applyToJob({ params: { jobId: "job" }, user: { id: "user" } }, res);
  assert.equal(res.code, 403); assert.equal(findJob.mock.callCount(), 0);
});
test("expired jobs cannot receive applications", async () => {
  verifiedApplicant();
  mock.method(Job, "findById", async () => ({ status: "open", verifiedStatus: "verified", expiredAt: new Date(0) }));
  const res = response(); await applyToJob({ params: { jobId: "job" }, user: { id: "user" } }, res); assert.equal(res.code, 400);
});
test("duplicate applications return a conflict", async () => {
  verifiedApplicant();
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
const STRONG_SECRET = "9f2c71ab3d84e605b1c7a9d2f0e4863b5a1d7c9e2f4b6081";
test("configuration rejects missing and weak secrets", () => {
  assert.throws(() => validateEnvironment({}), /MONGODB_URI/);
  assert.throws(() => validateEnvironment({ MONGODB_URI: "test", JWT_SECRET: "short", NODE_ENV: "production" }), /JWT_SECRET/);
  // Only an explicit development/test environment may use a weak secret.
  assert.doesNotThrow(() => validateEnvironment({ MONGODB_URI: "test", JWT_SECRET: "development-secret", NODE_ENV: "development" }));
});
test("a forgotten or mistyped NODE_ENV is held to production standards, so the published placeholder secret never works", () => {
  for (const NODE_ENV of [undefined, "", "prod", "staging"]) {
    assert.throws(
      () => validateEnvironment({ MONGODB_URI: "test", JWT_SECRET: "change_this_secret", NODE_ENV }),
      /JWT_SECRET/,
      `NODE_ENV=${NODE_ENV}`
    );
  }
});
test("placeholder and repeated-pattern secrets are rejected even when long enough", () => {
  for (const JWT_SECRET of ["x".repeat(32), "ab".repeat(24), "change_this_secret".padEnd(40, "!")]) {
    assert.throws(
      () => validateEnvironment({ MONGODB_URI: "test", JWT_SECRET, NODE_ENV: "production", CORS_ORIGIN: "https://a.example", FRONTEND_URL: "https://a.example", SMTP_HOST: "h", SMTP_USER: "u", SMTP_PASS: "p" }),
      /JWT_SECRET/,
      JWT_SECRET
    );
  }
});
test("production requires the origins that reset and invite links are built from", () => {
  const base = { MONGODB_URI: "test", JWT_SECRET: STRONG_SECRET, NODE_ENV: "production", SMTP_HOST: "h", SMTP_USER: "u", SMTP_PASS: "p" };
  assert.throws(() => validateEnvironment({ ...base, FRONTEND_URL: "https://a.example" }), /CORS_ORIGIN/);
  assert.throws(() => validateEnvironment({ ...base, CORS_ORIGIN: "https://a.example" }), /FRONTEND_URL/);
  assert.doesNotThrow(() => validateEnvironment({ ...base, CORS_ORIGIN: "https://a.example", FRONTEND_URL: "https://a.example", TRUST_PROXY: "1" }));
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
  await verifyUploadedFile("avatar")({ file: { path: filePath, mimetype: "image/png" } }, res, () => assert.fail("should not call next"));
  assert.equal(res.code, 400);
  assert.equal(fs.existsSync(filePath), false);
});
const realJpeg = (extra = {}) => sharp({ create: { width: 4, height: 2, channels: 3, background: "#f00" } }).jpeg().withExif(extra).toBuffer();
test("uploaded file content matching its declared kind is accepted", async () => {
  const filePath = path.join(os.tmpdir(), `${randomUUID()}.jpg`);
  fs.writeFileSync(filePath, await realJpeg());
  let passed = false;
  await verifyUploadedFile("avatar")({ file: { path: filePath, mimetype: "image/jpeg" } }, response(), () => { passed = true; });
  assert.equal(passed, true);
  fs.rmSync(filePath, { force: true });
});
test("real content of another allowed type than the one declared is rejected, because the declared type names the stored file", async () => {
  const filePath = path.join(os.tmpdir(), `${randomUUID()}.png`);
  fs.writeFileSync(filePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])); // a JPEG...
  const res = response();
  await verifyUploadedFile("avatar")({ file: { path: filePath, mimetype: "image/png" } }, res, () => assert.fail("declared PNG but bytes are JPEG")); // ...sent as PNG
  assert.equal(res.code, 400);
  assert.equal(fs.existsSync(filePath), false);
});
test("when one file in a request is bad, every uploaded file of that request is removed", async () => {
  const good = path.join(os.tmpdir(), `${randomUUID()}.jpg`);
  const bad = path.join(os.tmpdir(), `${randomUUID()}.jpg`);
  fs.writeFileSync(good, await realJpeg());
  fs.writeFileSync(bad, "not an image");
  const res = response();
  await verifyUploadedFile("applicationAttachment")({ files: [{ path: good, mimetype: "image/jpeg" }, { path: bad, mimetype: "image/jpeg" }] }, res, () => assert.fail("should not call next"));
  assert.equal(res.code, 400);
  assert.equal(fs.existsSync(good), false, "the valid file is not left behind");
  assert.equal(fs.existsSync(bad), false);
});
test("uploads of a refused request are deleted, uploads of an accepted one are kept", async () => {
  const run = (statusCode) => {
    const filePath = path.join(os.tmpdir(), `${randomUUID()}.jpg`);
    fs.writeFileSync(filePath, "x");
    const handlers = {};
    const res = { statusCode, on: (event, fn) => { handlers[event] = fn; } };
    discardUploadsOnFailure({ file: { path: filePath } }, res, () => {});
    handlers.close();
    return new Promise((resolve) => setTimeout(() => resolve(filePath), 50));
  };
  const refused = await run(409);
  assert.equal(fs.existsSync(refused), false);
  const accepted = await run(201);
  assert.equal(fs.existsSync(accepted), true);
  fs.rmSync(accepted, { force: true });
});
test("a photo's hidden metadata (owner, camera, location fields) is removed on upload", async () => {
  const filePath = path.join(os.tmpdir(), `${randomUUID()}.jpg`);
  fs.writeFileSync(filePath, await realJpeg({ IFD0: { Artist: "SomchaiOwner", Make: "SecretPhone" } }));
  // Metadata is read from bytes, not the path: sharp would keep the file open on Windows.
  const read = () => sharp(fs.readFileSync(filePath)).metadata();
  assert.ok((await read()).exif, "the test photo starts out with metadata");
  let passed = false;
  await verifyUploadedFile("avatar")({ file: { path: filePath, mimetype: "image/jpeg" } }, response(), () => { passed = true; });
  assert.equal(passed, true);
  const cleaned = await read();
  assert.equal(cleaned.exif, undefined, "no EXIF block left");
  const bytes = fs.readFileSync(filePath).toString("latin1");
  assert.ok(!bytes.includes("SecretPhone") && !bytes.includes("SomchaiOwner"));
  assert.deepEqual([cleaned.width, cleaned.height], [4, 2], "the picture itself is unchanged");
  fs.rmSync(filePath, { force: true });
});
test("an image that looks right but can't be decoded is rejected and deleted", async () => {
  const filePath = path.join(os.tmpdir(), `${randomUUID()}.png`);
  const valid = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#00f" } }).png().toBuffer();
  fs.writeFileSync(filePath, valid.subarray(0, valid.length - 40)); // valid signature, truncated body
  const res = response();
  await verifyUploadedFile("avatar")({ file: { path: filePath, mimetype: "image/png" } }, res, () => assert.fail("a corrupt image must not pass"));
  assert.equal(res.code, 400);
  assert.equal(fs.existsSync(filePath), false);
});
test("legacy .doc content (generic OLE container) is accepted where application/msword is allowed", async () => {
  const filePath = path.join(os.tmpdir(), `${randomUUID()}.doc`);
  fs.writeFileSync(filePath, Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]));
  let passed = false;
  await verifyUploadedFile("resume")({ file: { path: filePath, mimetype: "application/msword" } }, response(), () => { passed = true; });
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
  mock.method(Post, "find", () => chainable([{ _id: "p1", likedBy: [], user: { _id: "author" } }]));
  mock.method(Post, "countDocuments", async () => 42);
  mock.method(SavedPost, "find", () => chainable([]));
  mock.method(Comment, "aggregate", async () => [{ _id: "p1", count: 3 }]);

  const unpaged = response();
  await listPosts({ query: {}, user: { id: "u1" } }, unpaged);
  assert.equal(unpaged.headers["X-Total-Count"], undefined);
  assert.equal(unpaged.body[0].commentCount, 3, "counts come from one grouped query for the whole page");

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
  const origins = { CORS_ORIGIN: "https://a.example", FRONTEND_URL: "https://a.example" };
  assert.throws(
    () => validateEnvironment({ MONGODB_URI: "test", JWT_SECRET: STRONG_SECRET, NODE_ENV: "production", ...origins }),
    /SMTP/
  );
  assert.doesNotThrow(() =>
    validateEnvironment({
      MONGODB_URI: "test",
      JWT_SECRET: STRONG_SECRET,
      NODE_ENV: "production",
      ...origins,
      SMTP_HOST: "smtp.example.com",
      SMTP_USER: "user",
      SMTP_PASS: "pass",
    })
  );
});
