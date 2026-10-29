// การลบ กู้คืน และทำให้บัญชีไม่ระบุตัวตนพึ่งพา MongoDB เอง (query
// hook บน model User, การอัปเดตอาร์เรย์, update pipeline) ซึ่ง mock รับรองไม่ได้
// เทสต์เหล่านี้รันกับฐานข้อมูลชั่วคราวบน MongoDB ในเครื่อง และ
// จะถูกข้ามหากเชื่อมต่อไม่ได้ CI เปิด MongoDB ให้ (ดู .github/workflows/checks.yml)
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import AuditLog from "../src/models/AuditLog.js";
import Post from "../src/models/Post.js";
import EmotionLog from "../src/models/EmotionLog.js";
import CounsellingSession from "../src/models/CounsellingSession.js";
import FamilyLink from "../src/models/FamilyLink.js";
import FamilyMessage from "../src/models/FamilyMessage.js";
import Notification from "../src/models/Notification.js";
import Job from "../src/models/Job.js";
import Application from "../src/models/Application.js";
import { softDeleteUser, restoreUser, anonymizeExpiredUsers, RETENTION_DAYS } from "../src/services/accountLifecycleService.js";
import { verifyToken } from "../src/middleware/authMiddleware.js";
import { UPLOAD_ROOT } from "../src/middleware/upload.js";
import { startServer } from "./helpers/httpServer.js";

const DB = `mongodb://127.0.0.1:27017/glow-up-lifecycle-${randomUUID()}`;
const available = await mongoose.connect(DB, { serverSelectionTimeoutMS: 2500 }).then(() => true, () => false);
after(async () => {
  if (!available) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
const dbTest = (name, fn) => test(name, { skip: available ? false : "no local MongoDB is reachable", timeout: 30000 }, fn);

let counter = 0;
const makeUser = (fields = {}) =>
  User.create({ name: `ผู้ใช้ ${++counter}`, email: `user${counter}-${randomUUID().slice(0, 6)}@example.com`, password: "a-long-enough-password", role: "user", verifiedStatus: "verified", pdpaConsent: true, ...fields });
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const tokenFor = (user) => jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
const withDeleted = (query) => query.setOptions({ withDeleted: true });

dbTest("a deleted account disappears from every ordinary lookup, including populate, but stays findable on purpose", async () => {
  const author = await makeUser({ role: "counsellor" });
  await Post.create({ user: author._id, content: "บทความ" });
  await softDeleteUser(author._id, { actorId: null, reason: "test" });

  assert.equal(await User.findById(author._id), null);
  assert.equal(await User.findOne({ email: author.email }), null);
  assert.equal((await User.find({ _id: author._id })).length, 0);
  assert.equal(await User.exists({ _id: author._id }), null);
  assert.equal(await User.countDocuments({ _id: author._id }), 0);
  assert.equal((await Post.findOne({ user: author._id }).populate("user")).user, null, "references to it come back empty");

  assert.ok(await withDeleted(User.findById(author._id)), "code that asks for deleted accounts can find them");
  assert.ok(await User.findOne({ _id: author._id, deletedAt: { $ne: null } }), "so can a query that names deletedAt itself");
});

dbTest("a deleted account's sign-in token stops working at once", async () => {
  const person = await makeUser();
  const token = tokenFor(person);
  const outcome = async () => {
    const res = { code: 200, status(c) { this.code = c; return this; }, json() { return this; } };
    let passed = false;
    await verifyToken({ headers: { authorization: `Bearer ${token}` }, cookies: {} }, res, () => { passed = true; });
    return passed ? 200 : res.code;
  };
  assert.equal(await outcome(), 200);
  await softDeleteUser(person._id, { actorId: person._id, reason: "test" });
  assert.equal(await outcome(), 401);
  await restoreUser(person._id, null);
  assert.equal(await outcome(), 200, "and works again once restored");
});

dbTest("deleting an account winds down its live relationships and keeps its records", async () => {
  const patient = await makeUser();
  const counsellor = await makeUser({ role: "counsellor" });
  const family = await makeUser({ role: "family" });
  const employer = await makeUser({ role: "employer" });
  await User.updateOne({ _id: patient._id }, { assignedCounsellor: counsellor._id });
  const session = (fields) => CounsellingSession.create({ sessionType: "chat", topic: "t", message: "m", mood: "sad", preferredAt: new Date(), ...fields });
  const asked = await session({ user: patient._id, status: "pending" });
  const handled = await session({ user: patient._id, counsellor: counsellor._id, status: "active" });
  const link = await FamilyLink.create({ recoveringUser: patient._id, familyUser: family._id, inviteEmail: family.email, inviteTokenHash: "x", inviteExpiresAt: new Date(), status: "active" });
  await EmotionLog.create({ user: patient._id, happinessLevel: 3, dateKey: "2030-01-01", note: "บันทึกส่วนตัว" });
  const job = await Job.create({ title: "งาน", employer: employer._id, status: "open" });
  const application = await Application.create({ user: patient._id, job: job._id, status: "pending" });

  // ลบผู้ป่วย: คำขอของตนถูกถอน ลิงก์ครอบครัวถูกเพิกถอน ใบสมัครถูกถอน
  await softDeleteUser(patient._id, { actorId: patient._id, reason: "ผู้ใช้ลบบัญชีของตัวเอง" });
  assert.equal((await CounsellingSession.findById(asked._id)).status, "cancelled");
  assert.equal((await FamilyLink.findById(link._id)).status, "revoked");
  assert.equal((await Application.findById(application._id)).status, "cancelled");
  assert.equal((await EmotionLog.findOne({ user: patient._id })).note, "บันทึกส่วนตัว", "records are kept during the retention period");

  // ลบนายจ้าง: ประกาศงานที่เปิดอยู่ถูกปิด
  await softDeleteUser(employer._id, { actorId: null, reason: "test" });
  assert.equal((await Job.findById(job._id)).status, "closed");

  // ลบผู้ให้คำปรึกษา: เคสกลับเข้าคิวและผู้ป่วยได้รับแจ้ง
  const secondPatient = await makeUser();
  const reassigned = await session({ user: secondPatient._id, counsellor: counsellor._id, status: "scheduled" });
  await User.updateOne({ _id: secondPatient._id }, { assignedCounsellor: counsellor._id });
  await softDeleteUser(counsellor._id, { actorId: null, reason: "test" });
  const back = await CounsellingSession.findById(reassigned._id);
  assert.equal(back.status, "pending");
  assert.equal(back.counsellor, null);
  assert.equal((await User.findById(secondPatient._id)).assignedCounsellor, undefined);
  assert.equal(await Notification.countDocuments({ user: secondPatient._id }), 1);
  assert.ok(await AuditLog.findOne({ targetUser: patient._id, action: "account.deleted" }));
  assert.ok(handled);
});

dbTest("restoring brings an account back, but never one that has been anonymised", async () => {
  const person = await makeUser();
  await softDeleteUser(person._id, { actorId: null, reason: "test" });
  const restored = await restoreUser(person._id, null);
  assert.equal(restored.deletedAt, undefined);
  assert.ok(await User.findById(person._id));
  assert.ok(await AuditLog.findOne({ targetUser: person._id, action: "account.restored" }));

  const gone = await makeUser();
  await softDeleteUser(gone._id, { actorId: null, reason: "test" });
  await User.updateOne({ _id: gone._id }, { anonymizedAt: new Date() }, { withDeleted: true });
  assert.equal(await restoreUser(gone._id, null), null);
});

dbTest("accounts past the retention period are anonymised: identity, free text and files go; counts stay", async () => {
  const stored = path.join(UPLOAD_ROOT, "avatars", `lifecycle-test-${randomUUID()}.png`);
  fs.writeFileSync(stored, "fake image");
  const person = await makeUser({ nickname: "นิค", phone: "0812345678", address: "บ้านเลขที่ 1", bio: "เล่าเรื่องตัวเอง", avatarUrl: `/uploads/avatars/${path.basename(stored)}`, googleId: `g-${randomUUID()}` });
  const family = await makeUser({ role: "family" });
  const counsellor = await makeUser({ role: "counsellor" });
  await EmotionLog.create({ user: person._id, happinessLevel: 6, dateKey: "2030-01-02", note: "ความรู้สึกส่วนตัว" });
  await CounsellingSession.create({
    user: person._id, counsellor: counsellor._id, sessionType: "chat", topic: "เรื่องลับ", message: "ข้อความลับ", mood: "sad", preferredAt: new Date(),
    meetingLink: "https://zoom.us/j/1", messages: [{ sender: person._id, senderRole: "user", content: "แชตลับ" }, { sender: counsellor._id, senderRole: "counsellor", content: "ตอบลับ" }],
    outcome: { summary: "สรุปลับ", recordedAt: new Date() },
  });
  const link = await FamilyLink.create({ recoveringUser: person._id, familyUser: family._id, inviteEmail: "family-person@example.com", inviteTokenHash: "h", inviteExpiresAt: new Date(), status: "revoked" });
  await FamilyLink.create({ recoveringUser: person._id, inviteEmail: "second-person@example.com", inviteTokenHash: "h2", inviteExpiresAt: new Date(), status: "revoked" });
  await FamilyMessage.create({ familyLink: link._id, sender: person._id, senderRole: "user", content: "ข้อความถึงครอบครัว" });
  await Notification.create({ user: person._id, message: "แจ้งเตือนส่วนตัว" });

  await softDeleteUser(person._id, { actorId: person._id, reason: "test" });
  const recent = await makeUser();
  await softDeleteUser(recent._id, { actorId: null, reason: "test" });
  await User.updateOne({ _id: person._id }, { deletedAt: daysAgo(RETENTION_DAYS + 1) }, { withDeleted: true });
  await User.updateOne({ _id: recent._id }, { deletedAt: daysAgo(RETENTION_DAYS - 10) }, { withDeleted: true });

  assert.equal(await anonymizeExpiredUsers(), 1, "only the account whose time is up");

  const after = await withDeleted(User.findById(person._id)).select("+password");
  assert.equal(after.name, "ผู้ใช้ที่ถูกลบ");
  assert.equal(after.email, `deleted-${person._id}@anonymized.invalid`);
  for (const field of ["nickname", "phone", "address", "bio", "avatarUrl", "googleId", "password"]) assert.equal(after[field], undefined, field);
  assert.ok(after.anonymizedAt);
  assert.equal(fs.existsSync(stored), false, "the stored picture was deleted");

  assert.equal((await EmotionLog.findOne({ user: person._id })).note, undefined);
  assert.equal((await EmotionLog.findOne({ user: person._id })).happinessLevel, 6, "the number stays for statistics");
  const session = await CounsellingSession.findOne({ user: person._id });
  assert.deepEqual([session.topic, session.message, session.meetingLink, session.outcome?.summary], ["[ลบแล้ว]", "[ลบแล้ว]", undefined, undefined]);
  assert.deepEqual(session.messages.map((m) => m.content), ["[ลบแล้ว]", "[ลบแล้ว]"], "both sides of the chat");
  assert.equal((await FamilyMessage.findOne({ familyLink: link._id })).content, "[ลบแล้ว]");
  const emails = (await FamilyLink.find({ recoveringUser: person._id })).map((l) => l.inviteEmail);
  assert.equal(new Set(emails).size, 2, "other people's addresses are removed, each link still unique");
  assert.ok(emails.every((email) => email.endsWith("@anonymized.invalid")));
  assert.equal(await Notification.countDocuments({ user: person._id }), 0);
  assert.ok(await AuditLog.findOne({ targetUser: person._id, action: "account.anonymized", actor: null }));

  assert.equal((await withDeleted(User.findById(recent._id))).anonymizedAt, undefined, "a more recent deletion is left alone");
  assert.equal(await anonymizeExpiredUsers(), 0, "running again changes nothing");
});

// ---------- ผ่าน HTTP API จริง ----------

dbTest("the admin's deleted-accounts screens: list, read-only detail with an audit trail, restore", async (t) => {
  const base = await startServer(t);
  const admin = await makeUser({ role: "admin" });
  const patient = await makeUser({ name: "ผู้ป่วยที่ถูกลบ" });
  await EmotionLog.create({ user: patient._id, happinessLevel: 2, dateKey: "2030-02-01", note: "ยังอยู่ในช่วงเก็บรักษา" });
  await softDeleteUser(patient._id, { actorId: admin._id, reason: "ลบโดยผู้ดูแลระบบ" });
  const call = (path, { method = "GET", as = admin } = {}) => fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${tokenFor(as)}` } });

  const list = await (await call("/api/admin/deleted-users?q=ผู้ป่วยที่ถูกลบ")).json();
  assert.equal(list.length, 1);
  assert.equal(list[0].deletedByName, admin.name);
  assert.ok(list[0].daysLeft >= RETENTION_DAYS - 1);

  const detail = await (await call(`/api/admin/deleted-users/${patient._id}`)).json();
  assert.equal(detail.history.emotionLogs[0].note, "ยังอยู่ในช่วงเก็บรักษา", "kept records can be reviewed");
  assert.equal(detail.anonymized, false);
  assert.ok(detail.auditTrail.some((entry) => entry.action === "deleted-account.viewed" && entry.actor.name === admin.name), "opening it is on record");
  assert.equal(await AuditLog.countDocuments({ targetUser: patient._id, action: "deleted-account.viewed" }), 1);

  assert.equal((await call(`/api/admin/deleted-users/${patient._id}`, { as: patient })).status, 401, "the deleted person themselves is turned away");
  const outsider = await makeUser({ role: "counsellor" });
  assert.equal((await call("/api/admin/deleted-users", { as: outsider })).status, 403);
  assert.equal((await call(`/api/admin/deleted-users/${patient._id}`, { as: outsider })).status, 403);
  assert.equal((await call(`/api/admin/deleted-users/${patient._id}/restore`, { method: "POST", as: outsider })).status, 403);

  assert.equal((await call(`/api/admin/deleted-users/${patient._id}/restore`, { method: "POST" })).status, 200);
  assert.ok(await User.findById(patient._id));
  assert.equal((await call(`/api/admin/deleted-users/${patient._id}`)).status, 404, "no longer in the deleted list");

  const gone = await makeUser();
  await softDeleteUser(gone._id, { actorId: admin._id, reason: "test" });
  await anonymizeExpiredUsers(new Date(Date.now() + (RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000));
  const anonymised = await (await call(`/api/admin/deleted-users/${gone._id}`)).json();
  assert.equal(anonymised.anonymized, true);
  assert.equal(anonymised.history, null);
  assert.equal((await call(`/api/admin/deleted-users/${gone._id}/restore`, { method: "POST" })).status, 409);
});

dbTest("deleting your own account needs your password, ends the session, and the account can no longer sign in", { timeout: 60000 }, async (t) => {
  const base = await startServer(t);
  const email = `self-delete-${randomUUID().slice(0, 6)}@example.com`;
  await makeUser({ email, password: "my-own-password-123" });
  const post = (path, body, cookie) => fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie && { Cookie: cookie }) }, body: JSON.stringify(body) });
  const login = await post("/api/auth/login", { email, password: "my-own-password-123" });
  const cookie = login.headers.getSetCookie().find((c) => c.startsWith("token=")).split(";")[0];
  const del = (body) => fetch(`${base}/api/users/me`, { method: "DELETE", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(body) });

  assert.equal((await del({ password: "not-my-password" })).status, 401);
  assert.equal((await del({})).status, 401);
  assert.ok(await User.findOne({ email }), "nothing happened yet");

  const done = await del({ password: "my-own-password-123" });
  assert.equal(done.status, 204);
  assert.match(done.headers.getSetCookie().find((c) => c.startsWith("token=")), /Expires=Thu, 01 Jan 1970/);
  assert.equal(await User.findOne({ email }), null);
  assert.equal((await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } })).status, 401);
  assert.equal((await post("/api/auth/login", { email, password: "my-own-password-123" })).status, 401, "indistinguishable from an unknown account");
  const reRegister = await post("/api/auth/register/request-otp", { name: "ใหม่", email, password: "another-password-456", role: "user", pdpaConsent: true });
  assert.ok([200, 503].includes(reRegister.status));
  assert.equal(await mongoose.model("PendingRegistration").countDocuments({ email }), 0, "the address is still reserved until anonymisation");
});

dbTest("a Google-only account confirms deletion by typing its address; the last admin cannot delete itself", { timeout: 60000 }, async (t) => {
  const base = await startServer(t);
  const email = `google-${randomUUID().slice(0, 6)}@example.com`;
  const person = await User.create({ name: "Google คน", email, googleId: `g-${randomUUID()}`, role: "user", pdpaConsent: true });
  const del = (as, body) => fetch(`${base}/api/users/me`, { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenFor(as)}` }, body: JSON.stringify(body) });
  assert.equal((await del(person, {})).status, 400);
  assert.equal((await del(person, { confirmEmail: "someone-else@example.com" })).status, 400);
  assert.equal((await del(person, { confirmEmail: email.toUpperCase() })).status, 204);

  await User.deleteMany({ role: "admin" });
  const onlyAdmin = await makeUser({ role: "admin" });
  assert.equal((await del(onlyAdmin, { password: "a-long-enough-password" })).status, 400);
  assert.ok(await User.findById(onlyAdmin._id));
});
