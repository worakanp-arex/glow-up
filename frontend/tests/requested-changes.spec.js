import { test, expect } from "@playwright/test";

const person = { _id: "507f1f77bcf86cd799439011", name: "ก้าวใหม่ ใจดี", email: "test@example.com", verifiedStatus: "verified", certificates: [] };

// Every API call answers `[]` unless `responses` has an entry for it, keyed by
// "METHOD /path" or just "/path"; a function entry gets the route to answer itself.
async function mockApi(page, role, responses = {}) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.route("**/socket.io/**", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api", "");
    if (path === "/auth/me") return route.fulfill({ json: { ...person, role } });
    const answer = responses[`${request.method()} ${path}`] ?? responses[path] ?? (path === "/news" ? { articles: [] } : undefined);
    if (typeof answer === "function") return answer(route);
    return route.fulfill({ json: answer ?? [] });
  });
}

test("skills management counts each list, shows five, and expands on request", async ({ page }) => {
  const lessons = Array.from({ length: 7 }, (_, i) => ({ _id: `l${i}`, title: `บทเรียน ${i + 1}`, body: "เนื้อหา", audience: "user" }));
  await mockApi(page, "counsellor", { "/micro-lessons/all": lessons });
  await page.goto("/counsellor/lessons");

  await expect(page.getByRole("heading", { name: "บทเรียนทั้งหมด (7)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "สถานการณ์จำลองทั้งหมด (0)" })).toBeVisible();
  const rows = page.locator(".lesson-management-list > li");
  await expect(rows).toHaveCount(5);
  await page.getByRole("button", { name: /แสดงเพิ่มเติม/ }).click();
  await expect(rows).toHaveCount(7);
  await page.getByRole("button", { name: "แสดงน้อยลง" }).click();
  await expect(rows).toHaveCount(5);
});

test("a lesson can be edited and given an expiry date", async ({ page }) => {
  let sent;
  await mockApi(page, "counsellor", {
    "/micro-lessons/all": [{ _id: "l1", title: "บทเรียนเดิม", body: "เนื้อหา", audience: "user" }],
    "PUT /micro-lessons/l1": async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ json: { _id: "l1", title: "บทเรียนใหม่", body: "เนื้อหา", audience: "user", expiresAt: "2030-01-31T16:59:59.999Z" } });
    },
  });
  await page.goto("/counsellor/lessons");

  await page.getByRole("button", { name: "แก้ไขบทเรียน" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("ชื่อบทเรียน").fill("บทเรียนใหม่");
  await dialog.getByLabel(/วันหมดอายุ/).fill("2030-01-31");
  await dialog.getByRole("button", { name: "บันทึก", exact: true }).click();

  await expect(page.locator(".lesson-management-list-title", { hasText: "บทเรียนใหม่" })).toBeVisible();
  expect(sent).toMatchObject({ title: "บทเรียนใหม่", expiresAt: "2030-01-31" });
});

test("the counsellor queue opens with five cases and reveals the rest on request", async ({ page }) => {
  const sessions = Array.from({ length: 7 }, (_, i) => ({
    _id: `s${i}`, topic: `หัวข้อ ${i + 1}`, status: "pending", sessionType: "chat", counsellor: null,
    createdAt: "2030-01-01T03:00:00Z", preferredAt: "2030-01-02T03:00:00Z", user: { ...person, _id: `p${i}`, name: `ผู้ป่วย ${i + 1}` },
  }));
  await mockApi(page, "counsellor", { "/counselling": sessions });
  await page.goto("/counsellor");

  const rows = page.locator(".counsellor-queue-list > li");
  await expect(rows).toHaveCount(5);
  await page.getByRole("button", { name: /แสดงเพิ่มเติม/ }).click();
  await expect(rows).toHaveCount(7);
});

test("the hamburger menu shows an icon beside every link", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await mockApi(page, "user");
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "เปิดเมนู" }).first().click();

  const links = page.locator(".navbar-mobile-panel .navbar-mobile-link");
  expect(await links.count()).toBeGreaterThan(5);
  await expect(page.locator(".navbar-mobile-panel .navbar-mobile-link > svg")).toHaveCount(await links.count());
});

test("family messages read like a chat, newest last, and can be answered from the profile", async ({ page }) => {
  const messages = [
    { _id: "m2", senderRole: "family", content: "ข้อความล่าสุดจากครอบครัว", createdAt: "2030-01-02T03:00:00Z" },
    { _id: "m1", senderRole: "user", content: "ข้อความแรก", createdAt: "2030-01-01T03:00:00Z" },
  ];
  let sent;
  await mockApi(page, "user", {
    "/family/invited": [{ _id: "link1", status: "active", familyUser: { name: "แม่", email: "mom@example.com" } }],
    "/family/links/link1/messages": messages, // the API answers newest first
    "POST /family/links/link1/messages": async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { sent: true } });
    },
  });
  await page.goto("/profile?tab=family");

  const bubbles = page.locator(".family-history-list li p");
  await expect(bubbles).toHaveText(["ข้อความแรก", "ข้อความล่าสุดจากครอบครัว"]);

  await page.getByLabel("ข้อความตอบกลับ").fill("ขอบคุณค่ะ");
  await page.getByRole("button", { name: "ส่งข้อความ" }).click();
  await expect.poll(() => sent).toMatchObject({ message: "ขอบคุณค่ะ", replyTo: "m2" });
});

const latestMessage = (readAt) => ({ message: { _id: "m1", content: "สู้ ๆ นะ", createdAt: "2030-01-01T03:00:00Z", readAt }, family: { name: "แม่" }, linkId: "link1", unreadCount: 0 });
const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();

test("a message read more than ten minutes ago no longer replaces the welcome on the home page", async ({ page }) => {
  await mockApi(page, "user", { "/family/messages/latest": latestMessage(minutesAgo(11)) });
  await page.goto("/dashboard");
  await expect(page.getByText("ยินดีที่ได้เจอกันอีกครั้ง")).toBeVisible();
  await expect(page.getByText("สู้ ๆ นะ")).toHaveCount(0);
});

test("a message read a moment ago stays on the home page", async ({ page }) => {
  await mockApi(page, "user", { "/family/messages/latest": latestMessage(minutesAgo(2)) });
  await page.goto("/dashboard");
  await expect(page.getByText("สู้ ๆ นะ")).toBeVisible();
  await expect(page.getByText(/จะหายจากหน้าหลักใน 10 นาที/)).toBeVisible();
});

test("the self-assessment shows encouragement and next steps, never a risk label or the numbers", async ({ page }) => {
  await mockApi(page, "user", {
    "POST /risk/assess": async (route) => route.fulfill({ status: 201, json: { level: "high", riskScore: 80, triggerFactors: "ค่าเฉลี่ยความอยากยา 8.0/10, ความสุขเฉลี่ย 1.5/7 จาก 10 วันล่าสุด" } }),
  });
  await page.goto("/craving-tracker");
  await page.getByRole("button", { name: "ดูคำแนะนำสำหรับช่วงนี้" }).click();
  // No entries in the last week, so it first offers to fill the gaps; carry on without.
  await page.getByRole("button", { name: /ประเมินเลย/ }).click();

  const guidance = page.locator(".risk-guidance");
  await expect(guidance).toBeVisible();
  await expect(guidance.getByRole("link", { name: "ขอคำปรึกษาตอนนี้" })).toBeVisible();
  await expect(guidance.getByRole("link", { name: "โทร 1323" })).toHaveAttribute("href", "tel:1323");
  const text = await page.locator(".craving-tracker-risk").innerText();
  expect(text).not.toMatch(/ระดับความเสี่ยง|8\.0\/10|1\.5\/7/);
});
