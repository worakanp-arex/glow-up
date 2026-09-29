// Hammers the login endpoint with invalid credentials to prove the Phase-1
// rate limiter (backend/src/middleware/rateLimiters.js) actually engages
// under real concurrency, rather than just in the mocked unit test.
import autocannon from "autocannon";
import { pathToFileURL } from "node:url";

export async function run(baseUrl) {
  const result = await autocannon({
    url: `${baseUrl}/api/auth/login`,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "nobody@example.com", password: "wrong-password" }),
    connections: 20,
    duration: 5,
  });

  const rateLimited = result.statusCodeStats?.[429]?.count || 0;
  console.log(`\n--- auth-bruteforce ---`);
  console.log(`requests: ${result.requests.total}, 401 (invalid creds): ${result.statusCodeStats?.[401]?.count || 0}, 429 (rate limited): ${rateLimited}`);
  if (rateLimited === 0) {
    console.warn("WARNING: no 429 responses seen — the rate limiter may not be engaging as expected.");
  } else {
    console.log("OK: rate limiter engaged under load.");
  }
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.env.LOADTEST_BASE_URL || "http://localhost:5001").then(() => process.exit(0));
}
