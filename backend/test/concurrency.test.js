import { test, mock } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Job from "../src/models/Job.js";
import Application from "../src/models/Application.js";
import Course from "../src/models/Course.js";
import UserCourse from "../src/models/UserCourse.js";
import FamilyLink from "../src/models/FamilyLink.js";
import ActivityMission from "../src/models/ActivityMission.js";
import ActivityMissionLog from "../src/models/ActivityMissionLog.js";
import UserMission from "../src/models/UserMission.js";
import GamePlay from "../src/models/GamePlay.js";
import Reward from "../src/models/Reward.js";
import UserReward from "../src/models/UserReward.js";
import FamilyMissionLog from "../src/models/FamilyMissionLog.js";
import PendingRegistration from "../src/models/PendingRegistration.js";
import { verifyRegistrationOtp } from "../src/controllers/authController.js";
import { startServer } from "./helpers/httpServer.js";

function tokenFor(role, id = "racer") {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

const response = () => ({ code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, cookie() {} });

// Mongoose query chains (.select/.populate) that resolve to an empty array —
// used to stub out the reward-check side path that a successful mission/
// course/application write triggers, so it doesn't touch real models.
function emptyChain() {
  const obj = { select: () => obj, populate: () => obj, then: (resolve) => Promise.resolve([]).then(resolve) };
  return obj;
}

// Fires `count` concurrent requests against the same route and tallies status codes.
async function fireConcurrent(base, { method, path, token, body }, count) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const results = await Promise.all(
    Array.from({ length: count }, () =>
      fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }).then(async (res) => {
        await res.json().catch(() => null);
        return res.status;
      })
    )
  );
  return results;
}

test("concurrent job applications: exactly one succeeds, the rest see a conflict", { timeout: 10000 }, async (t) => {
  t.mock.method(User, "findById", () => ({ select: async () => ({ role: "user" }) }));
  t.mock.method(Job, "findById", async () => ({
    _id: "507f1f77bcf86cd799439011",
    status: "open",
    verifiedStatus: "verified",
    attachmentRequests: [],
  }));
  t.mock.method(Application, "findOne", async () => null);
  let created = false;
  t.mock.method(Application, "create", async () => {
    if (created) throw Object.assign(new Error("duplicate"), { code: 11000 });
    created = true;
    return { _id: "app1" };
  });

  const base = await startServer(t);
  const statuses = await fireConcurrent(
    base,
    { method: "POST", path: "/api/applications/jobs/507f1f77bcf86cd799439011/apply", token: tokenFor("user") },
    8
  );
  assert.equal(statuses.filter((s) => s === 201).length, 1);
  assert.equal(statuses.filter((s) => s === 409).length, 7);
});

test("concurrent course enrollment: the UserCourse unique index + 409 handling stop double-enrollment", { timeout: 10000 }, async (t) => {
  t.mock.method(User, "findById", () => ({ select: async () => ({ role: "user" }) }));
  t.mock.method(Course, "findById", async () => ({ _id: "507f1f77bcf86cd799439022" }));
  t.mock.method(UserCourse, "findOne", async () => null);
  let created = false;
  t.mock.method(UserCourse, "create", async () => {
    if (created) throw Object.assign(new Error("duplicate"), { code: 11000 });
    created = true;
    return { populate: async () => {} };
  });

  const base = await startServer(t);
  const statuses = await fireConcurrent(
    base,
    { method: "POST", path: "/api/courses/507f1f77bcf86cd799439022/enroll", token: tokenFor("user") },
    8
  );
  assert.equal(statuses.filter((s) => s === 201).length, 1);
  assert.equal(statuses.filter((s) => s === 409).length, 7);
});

test("concurrent activity-mission logging: unique index + 409 handling stop double-logging (reference pattern)", { timeout: 10000 }, async (t) => {
  t.mock.method(User, "findById", () => ({ select: async () => ({ role: "user" }) }));
  t.mock.method(ActivityMission, "findOne", async () => ({ _id: "507f1f77bcf86cd799439033", points: 5, category: "routine" }));
  let created = false;
  t.mock.method(ActivityMissionLog, "create", async () => {
    if (created) throw Object.assign(new Error("duplicate"), { code: 11000 });
    created = true;
    return { _id: "log1" };
  });
  // The one winning call reaches checkAndAwardRewards() afterwards — stub out
  // everything that side path touches so it resolves to "no new rewards".
  t.mock.method(UserMission, "find", () => emptyChain());
  t.mock.method(ActivityMissionLog, "find", () => emptyChain());
  t.mock.method(GamePlay, "find", () => emptyChain());
  t.mock.method(FamilyMissionLog, "find", () => emptyChain());
  t.mock.method(UserReward, "find", () => emptyChain());
  t.mock.method(Reward, "find", async () => []);

  const base = await startServer(t);
  const statuses = await fireConcurrent(
    base,
    { method: "POST", path: "/api/activity-missions/507f1f77bcf86cd799439033/log", token: tokenFor("user") },
    8
  );
  assert.equal(statuses.filter((s) => s === 201).length, 1);
  assert.equal(statuses.filter((s) => s === 409).length, 7);
});

test("concurrent family-invite-accept: exactly one acceptance wins", { timeout: 10000 }, async (t) => {
  t.mock.method(User, "findById", () => ({ select: async () => ({ email: "recipient@example.com", role: "user" }) }));
  t.mock.method(FamilyLink, "findOne", () => ({ select: async () => ({ _id: "link1" }) }));
  let accepted = false;
  t.mock.method(FamilyLink, "findOneAndUpdate", async () => {
    if (accepted) return null;
    accepted = true;
    return { _id: "link1", status: "active" };
  });

  const base = await startServer(t);
  const statuses = await fireConcurrent(
    base,
    {
      method: "POST",
      path: "/api/family/accept",
      token: tokenFor("user"),
      body: { email: "recipient@example.com", token: "secret" },
    },
    8
  );
  assert.equal(statuses.filter((s) => s === 200).length, 1);
  assert.equal(statuses.filter((s) => s === 409).length, 7);
});

test("concurrent OTP guesses can under-count failed attempts (documents an existing low-severity race)", async (t) => {
  let storedAttempts = 0;
  t.mock.method(PendingRegistration, "findOne", () => ({
    select: () => ({
      _id: "pending1",
      otpHash: "hash",
      otpExpiresAt: new Date(Date.now() + 60000),
      attempts: storedAttempts,
      async save() { storedAttempts = this.attempts; },
    }),
  }));
  // Real bcrypt work is what naturally separates the "read" and "write" halves
  // of `pending.attempts += 1; await pending.save()` across concurrent calls;
  // an artificial delay here just makes that gap reliable in a test.
  t.mock.method(bcrypt, "compare", async () => {
    await new Promise((resolve) => setTimeout(resolve, 15));
    return false;
  });

  const CONCURRENT = 5;
  await Promise.all(
    Array.from({ length: CONCURRENT }, () =>
      verifyRegistrationOtp({ body: { email: "race@example.com", otp: "000000" } }, response())
    )
  );

  assert.ok(
    storedAttempts < CONCURRENT,
    `expected the non-atomic read-modify-write to under-count (got ${storedAttempts} recorded attempts for ${CONCURRENT} concurrent guesses)`
  );
  assert.ok(storedAttempts >= 1);
});
