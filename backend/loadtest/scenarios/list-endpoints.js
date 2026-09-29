// Measures the now-paginated list endpoints (Phase 3) under concurrency
// against real seed data, instead of the old unbounded full-table scan.
import autocannon from "autocannon";
import { pathToFileURL } from "node:url";
import { loginAdmin, summarize, printSummary } from "../helpers.js";

const ENDPOINTS = [
  { name: "GET /api/jobs (public, paginated)", path: "/api/jobs?page=1&limit=10" },
  { name: "GET /api/posts (auth, paginated)", path: "/api/posts?page=1&limit=10", auth: true },
  { name: "GET /api/users (admin, paginated)", path: "/api/users?page=1&limit=10", auth: true },
];

export async function run(baseUrl) {
  const token = await loginAdmin(baseUrl);
  const results = [];
  for (const endpoint of ENDPOINTS) {
    const result = await autocannon({
      url: `${baseUrl}${endpoint.path}`,
      connections: 20,
      duration: 5,
      headers: endpoint.auth ? { authorization: `Bearer ${token}` } : {},
    });
    const summary = summarize(result);
    printSummary(endpoint.name, summary);
    results.push({ endpoint: endpoint.name, summary });
  }
  return results;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.env.LOADTEST_BASE_URL || "http://localhost:5001").then(() => process.exit(0));
}
