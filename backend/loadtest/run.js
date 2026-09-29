// Manual, opt-in load-test runner. Not wired into CI — see loadtest/README.md
// for the run procedure (needs a live MongoDB and a running backend server).
import { run as authBruteforce } from "./scenarios/auth-bruteforce.js";
import { run as listEndpoints } from "./scenarios/list-endpoints.js";
import { run as fileUpload } from "./scenarios/file-upload.js";
import { run as socketConnections } from "./scenarios/socket-connections.js";

const baseUrl = process.env.LOADTEST_BASE_URL || "http://localhost:5001";

async function main() {
  console.log(`Load testing ${baseUrl}\n(run "node loadtest/seed.js" first if you haven't already)`);

  const health = await fetch(`${baseUrl}/api/health`).catch(() => null);
  if (!health?.ok) {
    console.error(`Backend not reachable at ${baseUrl} — start it first with "npm run dev" (or "npm start").`);
    process.exit(1);
  }

  // auth-bruteforce deliberately exhausts the login rate limiter for this
  // client's IP (shared across login/OTP/reset — see rateLimiters.js), so it
  // runs last: everything else here needs to log in first.
  await listEndpoints(baseUrl);
  await fileUpload(baseUrl);
  await socketConnections(baseUrl);
  await authBruteforce(baseUrl);

  console.log("\nDone. This is a diagnostic report, not a pass/fail CI gate — review the numbers above.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
