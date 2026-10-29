import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import User from "../src/models/User.js";
import {
  loginAccountLimiter,
  forgotPasswordAccountLimiter,
  familyInviteRecipientLimiter,
  otpVerifyAccountLimiter,
  changePasswordLimiter,
} from "../src/middleware/rateLimiters.js";
import { startServer } from "./helpers/httpServer.js";

// แต่ละ limiter ถูกทดสอบในแอปเล็กๆ ของตัวเอง ตัวนับจึงเป็นของเทสต์นั้น
// และไม่ชนกับเทสต์อื่นที่ผ่านแอปจริง
async function serve(t, limiter, { user } = {}) {
  const app = express();
  app.use(express.json());
  if (user) app.use((req, res, next) => { req.user = user; next(); });
  let reached = 0;
  app.post("/", limiter, (req, res) => { reached += 1; res.status(req.body.fail ? 401 : 200).json({ ok: true }); });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (body) => {
    const res = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
  return { post, reached: () => reached };
}

test("failed sign-ins are capped per account, however the email is spelled, so many addresses can't share one guessing budget", async (t) => {
  const { post, reached } = await serve(t, loginAccountLimiter);
  const spellings = ["victim@gmail.com", "Victim@Gmail.com", "v.i.c.t.i.m@gmail.com", "victim+spam@gmail.com", "VICTIM@googlemail.com"];
  let blockedAt = null;
  for (let i = 0; i < 14; i += 1) {
    const { status } = await post({ email: spellings[i % spellings.length], fail: true });
    if (status === 429 && blockedAt === null) blockedAt = i + 1;
  }
  assert.equal(blockedAt, 11, "the 11th failed attempt in the window is refused");
  assert.equal(reached(), 10);
});

test("successful sign-ins don't use up the allowance, so people sharing a network aren't locked out by each other", async (t) => {
  const { post } = await serve(t, loginAccountLimiter);
  for (let i = 0; i < 25; i += 1) {
    const { status } = await post({ email: "teacher@example.com" });
    assert.equal(status, 200);
  }
});

test("other accounts are unaffected when one account is being hammered", async (t) => {
  const { post } = await serve(t, loginAccountLimiter);
  for (let i = 0; i < 12; i += 1) await post({ email: "target@example.com", fail: true });
  assert.equal((await post({ email: "target@example.com" })).status, 429);
  assert.equal((await post({ email: "someone-else@example.com" })).status, 200);
});

test("asking for reset emails is capped per address, and the cap answers exactly like a normal request", async (t) => {
  const { post, reached } = await serve(t, forgotPasswordAccountLimiter);
  const answers = [];
  for (let i = 0; i < 6; i += 1) answers.push(await post({ email: "inbox@example.com" }));
  assert.equal(reached(), 3, "only three reach the handler per hour");
  assert.ok(answers.every((answer) => answer.status === 200), "an attacker can't tell the limit was hit");
  assert.equal(answers[5].body.message, "หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปให้แล้ว");
});

test("one recipient can only be invited three times a day, whoever sends the invites", async (t) => {
  const { post } = await serve(t, familyInviteRecipientLimiter);
  const statuses = [];
  for (let i = 0; i < 5; i += 1) statuses.push((await post({ email: "target@example.com" })).status);
  assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
  assert.equal((await post({ email: "other@example.com" })).status, 200);
});

test("guessing a registration code is capped per address", async (t) => {
  const { post } = await serve(t, otpVerifyAccountLimiter);
  const statuses = [];
  for (let i = 0; i < 12; i += 1) statuses.push((await post({ email: "new@example.com" })).status);
  assert.equal(statuses.filter((status) => status === 429).length, 2);
});

test("wrong current passwords are capped per signed-in user", async (t) => {
  const { post } = await serve(t, changePasswordLimiter, { user: { id: "u1" } });
  let last;
  for (let i = 0; i < 12; i += 1) last = (await post({ fail: true })).status;
  assert.equal(last, 429);
});

test("the real app caps repeated failed sign-ins for one account", { timeout: 30000 }, async (t) => {
  t.mock.method(User, "findOne", () => ({ select: async () => null }));
  const base = await startServer(t);
  const statuses = [];
  for (let i = 0; i < 12; i += 1) {
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // สะกดต่างกันสองแบบ (ตัวพิมพ์เล็ก/ใหญ่ต่างกัน) แต่เป็นบัญชีเดียว
      body: JSON.stringify({ email: i % 2 ? "Real.App.Victim@Example.com" : "real.app.victim@example.com", password: "wrong-password" }),
    });
    statuses.push(res.status);
    await res.text();
  }
  assert.equal(statuses.indexOf(429), 10);
});
