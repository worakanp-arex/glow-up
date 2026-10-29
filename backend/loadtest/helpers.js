import { LOADTEST_USER_EMAIL, LOADTEST_USER_PASSWORD, LOADTEST_ADMIN_EMAIL, LOADTEST_ADMIN_PASSWORD } from "./credentials.js";

export async function login(baseUrl, email, password) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} — did you run "node loadtest/seed.js" first?`);
  }
  await res.text();
  // เซิร์ฟเวอร์เก็บเซสชันไว้ใน cookie แบบ HttpOnly และไม่ส่ง token ซ้ำใน response body แล้ว
  // การทดสอบโหลดจึงส่ง token ผ่าน Bearer header ซึ่ง API ยอมรับสำหรับไคลเอนต์ที่ไม่ใช่เบราว์เซอร์
  const cookie = res.headers.getSetCookie().find((entry) => entry.startsWith("token="));
  if (!cookie) throw new Error(`Login response for ${email} set no session cookie`);
  return decodeURIComponent(cookie.split(";")[0].slice("token=".length));
}

export function loginUser(baseUrl) {
  return login(baseUrl, LOADTEST_USER_EMAIL, LOADTEST_USER_PASSWORD);
}

export function loginAdmin(baseUrl) {
  return login(baseUrl, LOADTEST_ADMIN_EMAIL, LOADTEST_ADMIN_PASSWORD);
}

export function summarize(result) {
  return {
    requests: result.requests.total,
    errors: result.errors,
    timeouts: result.timeouts,
    statusCodes: {
      "2xx": result["2xx"],
      "4xx": result.non2xx - (result["3xx"] || 0),
      "5xx": result["5xx"] || 0,
    },
    latencyMs: { p50: result.latency.p50, p99: result.latency.p99, avg: result.latency.average },
    reqPerSec: result.requests.average,
  };
}

export function printSummary(name, summary) {
  console.log(`\n--- ${name} ---`);
  console.log(`requests: ${summary.requests}, errors: ${summary.errors}, timeouts: ${summary.timeouts}`);
  console.log(`req/sec (avg): ${summary.reqPerSec}`);
  console.log(`latency ms — p50: ${summary.latencyMs.p50}, p99: ${summary.latencyMs.p99}, avg: ${summary.latencyMs.avg}`);
}
