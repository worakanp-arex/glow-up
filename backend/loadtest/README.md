# Load testing (manual, opt-in)

This is a diagnostic tool for developers, not a CI gate — it is **not** run by `npm test` or by `.github/workflows/checks.yml`. It needs a real running backend and a real local MongoDB (unlike the rest of the test suite, which mocks everything).

## What it checks

- `scenarios/auth-bruteforce.js` — hammers `/api/auth/login` to confirm the rate limiter (`src/middleware/rateLimiters.js`) actually returns `429` under concurrent load.
- `scenarios/list-endpoints.js` — measures p50/p99 latency on the now-paginated list endpoints (`/api/jobs`, `/api/posts`, `/api/users`) against real seed data.
- `scenarios/file-upload.js` — concurrent avatar uploads, exercising multer plus the magic-byte file-type check under load.
- `scenarios/socket-connections.js` — opens many concurrent authenticated Socket.IO connections and measures connect/disconnect timing.

## Running it

1. Make sure MongoDB is running locally and `backend/.env` is set up (see the repo root `README.md`).
2. Seed load-test data (idempotent, safe to re-run; refuses to run if `NODE_ENV` is set to anything other than `development`):
   ```sh
   npm run loadtest:seed --prefix backend
   ```
3. In one terminal, start the backend and leave it running:
   ```sh
   npm run dev --prefix backend
   ```
4. In a second terminal, run the load test against it:
   ```sh
   npm run loadtest --prefix backend
   ```
   Point it at a different host/port with `LOADTEST_BASE_URL` (default `http://localhost:5001`), e.g.:
   ```sh
   LOADTEST_BASE_URL=http://localhost:5001 npm run loadtest --prefix backend
   ```
5. When done, remove the seeded data:
   ```sh
   npm run loadtest:cleanup --prefix backend
   ```

## Reading the output

Each scenario prints its own summary (request counts, status code breakdown, latency percentiles). There's no pass/fail exit code — review the numbers:

- **auth-bruteforce**: expect to see `429` responses appear after the configured limit (20 requests / 15 min per IP) — if you see none, the limiter isn't engaging.
- **list-endpoints**: p99 latency and error rate under 20 concurrent connections for 5 seconds. A regression here (compared to a previous run) is the signal to look at, not an absolute threshold.
- **file-upload**: errors/timeouts under concurrent multipart uploads.
- **socket-connections**: all requested connections should succeed; a large gap between min/median/max connect time suggests contention.

## Notes

- Uses an in-memory rate-limit store (single process) — if you ever horizontally scale the backend, `auth-bruteforce`'s result won't reflect a multi-instance deployment without a shared store (e.g. Redis).
- `auth-bruteforce` deliberately exhausts the login rate limit for this client's IP, and that limiter is shared across login/OTP-verify/Google/forgot-password/reset-password (by design — see `src/middleware/rateLimiters.js`). `run.js` runs it last for this reason; if you run it standalone (`node loadtest/scenarios/auth-bruteforce.js`) before the other scenarios against the same server process, their logins will also get rate-limited until the window resets (15 min) or you restart the server.
- `seed.js` creates a fixed set of login accounts (`loadtest.user@example.com`, `loadtest.admin@example.com`, `loadtest.employer@example.com`, all password `loadtest-password-123`) plus ~200 bulk users/jobs/posts. Never point this at a production database.
