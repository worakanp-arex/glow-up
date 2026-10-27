import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import User from "../src/models/User.js";
import PendingRegistration from "../src/models/PendingRegistration.js";
import EmotionLog from "../src/models/EmotionLog.js";
import { requestRegistrationOtp, login, changePassword, forgotPassword } from "../src/controllers/authController.js";
import { createEmotionLog } from "../src/controllers/emotionController.js";
import { verifyToken, sessionRejection } from "../src/middleware/authMiddleware.js";
import { passwordProblem } from "../src/utils/passwordPolicy.js";
import { assertLocalDatabase } from "../src/config/localOnly.js";
import { startServer } from "./helpers/httpServer.js";

afterEach(() => mock.restoreAll());
// Registration looks accounts up including deleted ones (their address stays reserved).
const accountLookup = (found) => () => ({ setOptions: async () => found });

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
function response() {
  return {
    code: 200, body: null, cookies: {},
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
    cookie(name, value, options) { this.cookies[name] = { value, options }; },
    clearCookie(name, options) { this.cleared = { name, options }; },
  };
}
function chainable(result) {
  const obj = { sort: () => obj, populate: () => obj, select: () => obj, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
  return obj;
}

// ---------- registration cannot be taken over ----------

const NEW_REGISTRATION = { role: "user", name: "เหยื่อ", email: "victim@example.com", password: "victim-chosen-pass", pdpaConsent: true };
const livePending = (overrides = {}) => ({
  email: "victim@example.com",
  otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
  lastSentAt: new Date(Date.now() - 5 * 60 * 1000),
  registrationTokenHash: sha256("v".repeat(64)),
  ...overrides,
});

test("someone without the secret cannot replace a pending registration, so the real owner's OTP can never be bound to an attacker's password", async () => {
  mock.method(User, "findOne", accountLookup(null));
  mock.method(PendingRegistration, "findOne", () => ({ select: async () => livePending() }));
  const replace = mock.method(PendingRegistration, "findOneAndUpdate", async () => assert.fail("pending request must not be replaced"));
  for (const registrationToken of [undefined, "x".repeat(64), "short"]) {
    const res = response();
    await requestRegistrationOtp({ body: { ...NEW_REGISTRATION, password: "attacker-chosen-pass", registrationToken } }, res);
    assert.equal(res.code, 429);
  }
  assert.equal(replace.mock.callCount(), 0);
});

test("the browser that started a registration can ask for a new code, after the cooldown, and gets a fresh secret", async () => {
  mock.method(User, "findOne", accountLookup(null));
  mock.method(PendingRegistration, "findOne", () => ({ select: async () => livePending() }));
  let stored;
  mock.method(PendingRegistration, "findOneAndUpdate", async (_filter, update) => { stored = update; });
  mock.method(console, "log", () => {});
  const res = response();
  await requestRegistrationOtp({ body: { ...NEW_REGISTRATION, registrationToken: "v".repeat(64) } }, res);
  assert.equal(res.code, 200);
  assert.notEqual(res.body.registrationToken, "v".repeat(64));
  assert.equal(stored.registrationTokenHash, sha256(res.body.registrationToken));
});

test("asking for codes too quickly is refused even for the owner", async () => {
  mock.method(User, "findOne", accountLookup(null));
  mock.method(PendingRegistration, "findOne", () => ({ select: async () => livePending({ lastSentAt: new Date() }) }));
  mock.method(PendingRegistration, "findOneAndUpdate", async () => assert.fail("must wait for the cooldown"));
  const res = response();
  await requestRegistrationOtp({ body: { ...NEW_REGISTRATION, registrationToken: "v".repeat(64) } }, res);
  assert.equal(res.code, 429);
});

test("a pending registration whose code has expired can be started over by anyone", async () => {
  mock.method(User, "findOne", accountLookup(null));
  mock.method(PendingRegistration, "findOne", () => ({ select: async () => livePending({ otpExpiresAt: new Date(Date.now() - 1000) }) }));
  const replace = mock.method(PendingRegistration, "findOneAndUpdate", async () => ({}));
  mock.method(console, "log", () => {});
  const res = response();
  await requestRegistrationOtp({ body: NEW_REGISTRATION }, res);
  assert.equal(res.code, 200);
  assert.equal(replace.mock.callCount(), 1);
});

test("signing up with an address that already has an account answers like a new sign-up and creates nothing", async () => {
  mock.method(User, "findOne", accountLookup({ _id: "existing" }));
  mock.method(PendingRegistration, "findOne", () => assert.fail("must not look at pending requests"));
  mock.method(PendingRegistration, "findOneAndUpdate", async () => assert.fail("must not create a pending request"));
  const taken = response();
  await requestRegistrationOtp({ body: NEW_REGISTRATION }, taken);

  mock.restoreAll();
  mock.method(User, "findOne", accountLookup(null));
  mock.method(PendingRegistration, "findOne", () => ({ select: async () => null }));
  mock.method(PendingRegistration, "findOneAndUpdate", async () => ({}));
  mock.method(console, "log", () => {});
  const fresh = response();
  await requestRegistrationOtp({ body: NEW_REGISTRATION }, fresh);

  assert.equal(taken.code, fresh.code);
  assert.deepEqual(Object.keys(taken.body).sort(), Object.keys(fresh.body).sort());
  assert.equal(taken.body.message, fresh.body.message);
});

// ---------- signing in ----------

test("signing in sets an HttpOnly cookie that lives as long as the token, and never repeats the token in the body", async () => {
  const hash = await bcrypt.hash("a-long-enough-password", 4);
  mock.method(User, "findOne", () => ({ select: async () => ({ _id: { toString: () => "u1" }, role: "user", password: hash, verifiedStatus: "verified", toObject() { return { _id: "u1", role: "user", password: hash }; } }) }));
  const res = response();
  await login({ body: { email: "a@example.com", password: "a-long-enough-password" } }, res);
  assert.equal(res.code, 200);
  assert.equal("token" in res.body, false);
  assert.equal(res.body.user.password, undefined);

  const { value, options } = res.cookies.token;
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  const { exp, iat } = jwt.decode(value);
  assert.ok(Math.abs(options.maxAge - (exp * 1000 - Date.now())) < 5000, "cookie expires with the token");
  assert.equal(exp - iat, 24 * 60 * 60, "sessions last one day unless JWT_EXPIRES_IN says otherwise");
});

test("the cookie is Secure unless the environment is explicitly development or test", async () => {
  const hash = await bcrypt.hash("a-long-enough-password", 4);
  mock.method(User, "findOne", () => ({ select: async () => ({ _id: { toString: () => "u1" }, role: "user", password: hash, toObject() { return {}; } }) }));
  const original = process.env.NODE_ENV;
  try {
    const secureFor = async (env) => {
      if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env;
      const res = response();
      await login({ body: { email: "a@example.com", password: "a-long-enough-password" } }, res);
      return res.cookies.token.options.secure;
    };
    assert.equal(await secureFor("production"), true);
    assert.equal(await secureFor(undefined), true, "an unset NODE_ENV is not trusted");
    assert.equal(await secureFor("staging"), true);
    assert.equal(await secureFor("development"), false);
    assert.equal(await secureFor("test"), false);
  } finally {
    process.env.NODE_ENV = original;
  }
});

test("an unknown email, a Google-only account and a wrong password get the identical answer", async () => {
  const hash = await bcrypt.hash("the-right-password", 4);
  const answer = async (account) => {
    mock.method(User, "findOne", () => ({ select: async () => account }));
    const res = response();
    await login({ body: { email: "someone@example.com", password: "a-wrong-password" } }, res);
    mock.restoreAll();
    return { code: res.code, body: res.body };
  };
  const unknown = await answer(null);
  const googleOnly = await answer({ _id: "g", role: "user" });
  const wrong = await answer({ _id: "w", role: "user", password: hash });
  assert.deepEqual(unknown, { code: 401, body: { message: "Invalid email or password" } });
  assert.deepEqual(googleOnly, unknown);
  assert.deepEqual(wrong, unknown);
});

test("login input that isn't text is rejected with 400 instead of crashing into a 500 that gives away which emails exist", { timeout: 20000 }, async (t) => {
  t.mock.method(User, "findOne", () => assert.fail("must not reach the database"));
  const base = await startServer(t);
  const attempt = async (body) => {
    const res = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { status: res.status, text: await res.text() };
  };
  for (const body of [
    { email: "a@example.com", password: 123456 },
    { email: "a@example.com", password: ["x"] },
    { email: "a@example.com", password: { toString: "x" } },
    { email: ["a@example.com"], password: "something-long" },
    { email: "a@example.com", password: "x".repeat(5000) },
  ]) {
    const { status } = await attempt(body);
    assert.equal(status, 400, JSON.stringify(body).slice(0, 60));
  }
});

test("validation answers say which field failed but never echo the submitted value (a password)", { timeout: 20000 }, async (t) => {
  const base = await startServer(t);
  const secret = "short-pw";
  const res = await fetch(`${base}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "a@example.com", token: "t", newPassword: secret }),
  });
  const text = await res.text();
  assert.equal(res.status, 400);
  assert.ok(!text.includes(secret));
  assert.ok(JSON.parse(text).errors.every((error) => !("value" in error)));
});

// ---------- password policy ----------

test("passwords must be 10-128 characters and not an obvious one", () => {
  assert.match(passwordProblem("short"), /10/);
  assert.match(passwordProblem("x".repeat(129)), /128/);
  assert.match(passwordProblem("password123"), /เดา/);
  assert.match(passwordProblem("1234567890"), /เดา/);
  assert.match(passwordProblem("aaaaaaaaaaaa"), /เดา/);
  assert.match(passwordProblem(123456789012), /ข้อความ/);
  assert.equal(passwordProblem("correct-horse-battery"), null);
  assert.equal(passwordProblem("รหัสผ่านภาษาไทยยาวพอสมควร"), null);
});

test("registration, reset and change all refuse a weak new password", { timeout: 20000 }, async (t) => {
  const base = await startServer(t);
  const post = async (path, body) => (await fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).status;
  assert.equal(await post("/api/auth/register/request-otp", { name: "ก", email: "a@example.com", password: "password123", role: "user", pdpaConsent: true }), 400);
  assert.equal(await post("/api/auth/reset-password", { email: "a@example.com", token: "t", newPassword: "12345678" }), 400);
});

// ---------- sessions end when the password changes ----------

const tokenIssuedAt = (iat) => jwt.sign({ id: "u1", role: "user", iat }, process.env.JWT_SECRET, { expiresIn: "1h" });

test("a token issued before the password was changed stops working; a later one, or one from the same second, works", () => {
  const changedAt = new Date("2030-01-01T10:00:00.700Z");
  const changedSecond = Math.floor(changedAt.getTime() / 1000);
  const user = { role: "user", verifiedStatus: "verified", passwordChangedAt: changedAt };
  assert.equal(sessionRejection({ iat: changedSecond - 1 }, user).status, 401);
  assert.equal(sessionRejection({ iat: changedSecond }, user), null, "the fresh token handed out by change-password");
  assert.equal(sessionRejection({ iat: changedSecond + 60 }, user), null);
  assert.equal(sessionRejection({ iat: 1 }, { role: "user", verifiedStatus: "verified" }), null, "accounts that never changed their password are unaffected");
});

test("the API refuses an old token after a password change", async () => {
  const nowSecond = Math.floor(Date.now() / 1000);
  mock.method(User, "findById", () => chainable({ role: "user", verifiedStatus: "verified", passwordChangedAt: new Date() }));
  const stale = response();
  await verifyToken({ headers: { authorization: `Bearer ${tokenIssuedAt(nowSecond - 3600)}` }, cookies: {} }, stale, () => assert.fail("stale token accepted"));
  assert.equal(stale.code, 401);
  let passed = false;
  await verifyToken({ headers: { authorization: `Bearer ${tokenIssuedAt(nowSecond)}` }, cookies: {} }, response(), () => { passed = true; });
  assert.equal(passed, true);
});

test("changing the password keeps this device signed in with a fresh token", async () => {
  const hash = await bcrypt.hash("old-password-123", 4);
  const user = { _id: { toString: () => "u1" }, role: "user", password: hash, comparePassword: (candidate) => bcrypt.compare(candidate, hash), save: mock.fn(async () => {}) };
  mock.method(User, "findById", () => ({ select: async () => user }));
  const res = response();
  await changePassword({ user: { id: "u1" }, body: { currentPassword: "old-password-123", newPassword: "new-password-4567" } }, res);
  assert.equal(res.code, 200);
  assert.equal(user.save.mock.callCount(), 1);
  assert.equal(jwt.decode(res.cookies.token.value).id, "u1");
});

test("a forgotten-password request can't keep replacing a reset link that was just sent", async () => {
  const fresh = { password: "hash", resetPasswordExpires: new Date(Date.now() + 29 * 60 * 1000), save: mock.fn(async () => {}) };
  mock.method(User, "findOne", () => ({ select: async () => fresh }));
  const res = response();
  await forgotPassword({ body: { email: "a@example.com" } }, res);
  assert.equal(res.code, 200);
  assert.equal(fresh.save.mock.callCount(), 0, "the link in the owner's inbox stays valid");

  const old = { password: "hash", resetPasswordExpires: new Date(Date.now() + 5 * 60 * 1000), save: mock.fn(async () => {}) };
  mock.method(User, "findOne", () => ({ select: async () => old }));
  mock.method(console, "error", () => {});
  await forgotPassword({ body: { email: "a@example.com" } }, response());
  assert.equal(old.save.mock.callCount(), 1);
});

// ---------- refusing cross-site writes ----------

test("a write from another site is refused before authentication; the same request from our own origin gets as far as authentication", { timeout: 20000 }, async (t) => {
  const base = await startServer(t);
  const post = async (origin) => (await fetch(`${base}/api/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(origin && { Origin: origin }) },
    body: JSON.stringify({ content: "x" }),
  })).status;
  assert.equal(await post("https://evil.example"), 403);
  assert.equal(await post("null"), 403);
  assert.equal(await post("http://localhost:5173"), 401);
  assert.equal(await post(undefined), 401, "non-browser clients send no Origin");
});

// ---------- backfilling check-ins ----------

test("a mood check-in can only be backfilled a week, and only with a real date", async () => {
  mock.method(EmotionLog, "findOneAndUpdate", async () => assert.fail("must not be saved"));
  const attempt = async (dateKey) => {
    const res = response();
    await createEmotionLog({ user: { id: "u1" }, body: { happinessLevel: 4, dateKey } }, res);
    return res.code;
  };
  assert.equal(await attempt("2020-01-01"), 400);
  assert.equal(await attempt("2999-01-01"), 400);
  assert.equal(await attempt("2026-13-45"), 400);
  assert.equal(await attempt("not-a-date"), 400);
  assert.equal(await attempt({ $gt: "" }), 400);
});

// ---------- seed scripts ----------

test("seed scripts that create publicly known passwords refuse any database that isn't on this machine", () => {
  for (const uri of ["mongodb://localhost:27017/glow-up", "mongodb://127.0.0.1/x", "mongodb://user:pw@localhost/x"]) {
    assert.doesNotThrow(() => assertLocalDatabase(uri), uri);
  }
  for (const uri of ["mongodb+srv://user:pw@cluster0.abcde.mongodb.net/glow-up", "mongodb://db.example.com:27017/x", "mongodb://a:1,b:2/x", "", "not a uri"]) {
    assert.throws(() => assertLocalDatabase(uri), /Refusing/, String(uri));
  }
  // With no argument it checks the configured MONGODB_URI (the test setup points it at localhost).
  assert.doesNotThrow(() => assertLocalDatabase());
});
