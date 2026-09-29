import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import { startServer } from "./helpers/httpServer.js";

function tokenFor(role, id = "tester") {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

// Table-driven boundary cases across the validator groups rolled out in
// Phase 2 (ObjectId params, enum fields, free text, pagination) — a
// representative sample, not an exhaustive endpoint-by-endpoint sweep.
const CASES = [
  {
    name: "ObjectId param: malformed id is rejected before hitting the DB",
    role: "user",
    method: "GET",
    path: "/api/users/not-a-valid-id/public",
  },
  {
    name: "Enum body field: invalid counselling status is rejected",
    role: "admin",
    method: "PUT",
    path: "/api/counselling/507f1f77bcf86cd799439011/status",
    body: { status: "not-a-real-status" },
  },
  {
    name: "Free text: empty post content is rejected",
    role: "counsellor",
    method: "POST",
    path: "/api/posts",
    body: { content: "   " },
  },
  {
    name: "Required field: creating a job without a title is rejected",
    role: "employer",
    method: "POST",
    path: "/api/jobs",
    body: { externalUrl: "https://example.com/job" },
  },
  {
    name: "Pagination query: a non-numeric page is rejected",
    role: null,
    method: "GET",
    path: "/api/jobs?page=abc",
  },
  {
    name: "Email format: inviting a family member with a bad email is rejected",
    role: "user",
    method: "POST",
    path: "/api/family/invite",
    body: { email: "not-an-email" },
  },
];

for (const testCase of CASES) {
  test(testCase.name, { timeout: 10000 }, async (t) => {
    if (testCase.role) {
      t.mock.method(User, "findById", () => ({ select: async () => ({ role: testCase.role }) }));
    }
    const base = await startServer(t);
    const headers = { "Content-Type": "application/json" };
    if (testCase.role) headers.Authorization = `Bearer ${tokenFor(testCase.role)}`;

    const res = await fetch(`${base}${testCase.path}`, {
      method: testCase.method,
      headers,
      body: testCase.body ? JSON.stringify(testCase.body) : undefined,
    });
    const payload = await res.json().catch(() => null);
    assert.equal(res.status, 400, `expected 400, got ${res.status}: ${JSON.stringify(payload)}`);
    assert.ok(Array.isArray(payload?.errors), "expects an express-validator-shaped errors array");
  });
}
