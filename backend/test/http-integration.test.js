import { test, mock } from "node:test";
import assert from "node:assert/strict";
import User from "../src/models/User.js";
import { startServer } from "./helpers/httpServer.js";

test("repeated login attempts from the same client are rate limited", { timeout: 10000 }, async (t) => {
  t.mock.method(User, "findOne", () => ({ select: async () => null }));
  const base = await startServer(t);
  const body = JSON.stringify({ email: "attacker@example.com", password: "wrong-password" });
  const headers = { "Content-Type": "application/json" };

  let lastStatus;
  for (let i = 0; i < 21; i++) {
    const res = await fetch(`${base}/api/auth/login`, { method: "POST", headers, body });
    lastStatus = res.status;
    await res.text();
  }
  assert.equal(lastStatus, 429);
});

test("security headers are present, and the public avatar route relaxes CORP", { timeout: 10000 }, async (t) => {
  const base = await startServer(t);
  const health = await fetch(`${base}/api/health`);
  await health.text();
  assert.equal(health.headers.get("x-content-type-options"), "nosniff");
  assert.ok(health.headers.get("cross-origin-resource-policy") !== "cross-origin");

  const avatar = await fetch(`${base}/uploads/avatars/does-not-exist.jpg`);
  await avatar.text();
  assert.equal(avatar.headers.get("cross-origin-resource-policy"), "cross-origin");
});

test("oversized JSON request bodies are rejected instead of exhausting server memory", { timeout: 10000 }, async (t) => {
  const base = await startServer(t);
  const oversized = JSON.stringify({ content: "x".repeat(2 * 1024 * 1024) });
  const res = await fetch(`${base}/api/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: oversized,
  });
  await res.text();
  assert.equal(res.status, 413);
});

test("requests from an origin outside CORS_ORIGIN don't receive an Access-Control-Allow-Origin echo", { timeout: 10000 }, async (t) => {
  const base = await startServer(t);
  const res = await fetch(`${base}/api/health`, { headers: { Origin: "https://evil.example.com" } });
  await res.text();
  assert.notEqual(res.headers.get("access-control-allow-origin"), "https://evil.example.com");
});
