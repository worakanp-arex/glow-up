import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import PendingRegistration from "../src/models/PendingRegistration.js";
import FamilyLink from "../src/models/FamilyLink.js";
import { requestRegistrationOtp, verifyRegistrationOtp } from "../src/controllers/authController.js";
import { acceptFamilyInvite } from "../src/controllers/familyController.js";
import { requireRole } from "../src/middleware/authMiddleware.js";

afterEach(() => mock.restoreAll());
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, cookie() {} });

test("family registration preserves the role through OTP and excludes password from the response", async () => {
  let pending;
  mock.method(User, "findOne", async () => null);
  mock.method(PendingRegistration, "findOne", async () => null);
  mock.method(PendingRegistration, "findOneAndUpdate", async (_, payload) => { pending = { _id: "pending1", ...payload }; });
  mock.method(console, "log", () => {});
  const res = response();
  await requestRegistrationOtp({ body: { role: "family", name: "Family Member", email: "family@example.com", password: "correct-horse-123", pdpaConsent: true } }, res);
  assert.equal(res.code, 200);
  assert.equal(pending.payload.role, "family");
  assert.ok(await bcrypt.compare("correct-horse-123", pending.passwordHash));
  pending.otpHash = await bcrypt.hash("123456", 10);
  mock.method(PendingRegistration, "findOne", () => ({ select: async () => pending }));
  mock.method(PendingRegistration, "deleteOne", async () => ({}));
  mock.method(User.prototype, "save", async function () { await this.validate(); });
  await verifyRegistrationOtp({ body: { email: "family@example.com", otp: "123456" } }, res);
  assert.equal(res.code, 201);
  assert.equal(res.body.user.role, "family");
  assert.equal(res.body.user.password, undefined);
  assert.equal(jwt.verify(res.body.token, process.env.JWT_SECRET).role, "family");
});

for (const role of ["family", "user"]) test(`${role} can accept an invitation sent to their own email`, async () => {
  mock.method(User, "findById", () => ({ select: async () => ({ email: "family@example.com", role }) }));
  mock.method(FamilyLink, "findOne", filter => {
    assert.equal(filter.inviteEmail, "family@example.com");
    return { select: async () => ({ _id: "invite1" }) };
  });
  mock.method(FamilyLink, "findOneAndUpdate", async (_filter, update) => {
    assert.equal(update.$set.familyUser, "recipient");
    return { _id: "invite1", status: "active" };
  });
  const res = response();
  await acceptFamilyInvite({ user: { id: "recipient" }, body: { email: "family@example.com", token: "invitation-token" } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.status, "active");
});

test("a family account cannot accept someone else's invitation or access patient-only operations", async () => {
  mock.method(User, "findById", () => ({ select: async () => ({ email: "different@example.com", role: "family" }) }));
  mock.method(FamilyLink, "findOne", () => assert.fail("must reject before looking up invite"));
  const res = response();
  await acceptFamilyInvite({ user: { id: "recipient" }, body: { email: "family@example.com", token: "token" } }, res);
  assert.equal(res.code, 403);
  requireRole("user")({ user: { role: "family" } }, res, () => assert.fail("family accessed patient-only operation"));
  assert.equal(res.code, 403);
});
