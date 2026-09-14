import { test, expect } from "@playwright/test";

const user = { _id: "user1", name: "ก้าวใหม่ ใจดี", email: "test@example.com", role: "user", verifiedStatus: "verified", certificates: [] };
const author = { _id: "staff1", role: "counsellor", name: "คุณหมอใจดี" };
const job = { _id: "1", title: "เจ้าหน้าที่ดูแลลูกค้า", employer: { name: "บริษัท โอกาสใหม่" }, description: "ร่วมเติบโตไปกับทีมที่พร้อมให้โอกาส", location: "ขอนแก่น", salary: 18000, status: "open", verifiedStatus: "verified", skills: [] };
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
async function setup(page, options = {}) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.route("https://fonts.gstatic.com/**", route => route.abort());
  await page.route("**/socket.io/**", route => route.abort());
  const state = {
    liked: false, likeCalls: 0, flags: 0,
    notifications: options.notifications || [],
    post: { _id: "1", user: author, content: "วันนี้เรามาให้กำลังใจกัน", tags: ["กำลังใจ"], likes: 0, likedByMe: false, comments: [], commentCount: 0, createdAt: today },
  };
  await page.route("**/api/**", async route => {
    const p = new URL(route.request().url()).pathname.replace("/api", "");
    const method = route.request().method();
    let data = [];
    if (p === "/auth/me") data = user;
    else if (p === "/jobs") data = [job];
    else if (p === "/jobs/1") data = { ...job, ...options.job };
    else if (p === "/applications/me") data = options.noApplication ? [] : [{ _id: "a1", job, status: options.status || "pending", appliedAt: today, match: { score: 50, matchedSkills: ["การบริการลูกค้า"], missingSkills: ["คอมพิวเตอร์"], totalSkills: 2 } }];
    else if (p === "/users/me/recovery-summary") data = options.recovery || { ongoing: false, endDate: "2025-01-01T00:00:00Z" };
    else if (p === "/missions/me/summary") data = { totalPoints: 75, completedMissions: 2 };
    else if (p === "/missions/me") data = [{ mission: { _id: "m1", title: "เช็คอินครั้งแรก", targetValue: 1, rewardPoints: 25 }, progress: 1, completed: true }, { mission: { _id: "m2", title: "เช็คอินต่อเนื่อง", targetValue: 7, rewardPoints: 50 }, progress: 3, completed: false }];
    else if (p === "/emotion/streak") data = { currentStreak: 3, longestStreak: 7, totalCheckIns: 10, loggedToday: true, history: [{ date: today, done: true, happinessLevel: 4 }] };
    else if (p === "/counselling/me") data = [{ _id: "s1", user, topic: "คำขอเดิม", createdAt: today, status: "pending", sessionType: "chat" }];
    else if (p === "/notifications/me/read") { state.notifications = state.notifications.map(n => ({ ...n, status: "read" })); data = { success: true }; }
    else if (p === "/notifications/me") { if (method === "DELETE") state.notifications = []; data = state.notifications; }
    else if (/^\/notifications\/.+\/read$/.test(p)) { data = { ...state.notifications.find(n => p.includes(n._id)), status: "read" }; state.notifications = state.notifications.map(n => n._id === data._id ? data : n); }
    else if (p === "/news") data = { articles: [{ id: "article1", title: "ข่าวการฟื้นฟูวันนี้", excerpt: "เรื่องราวของการดูแลตัวเอง", link: "https://example.com/news" }] };
    else if (p === "/posts/1/like") {
      state.likeCalls++;
      if (options.delayLike) await new Promise(resolve => setTimeout(resolve, 200));
      if (options.failLike) return route.fulfill({ status: 500, json: { message: "failed" } });
      state.liked = route.request().postDataJSON().liked;
      state.post = { ...state.post, likes: state.liked ? 1 : 0, likedByMe: state.liked };
      data = { likes: state.post.likes, likedByMe: state.liked };
    } else if (p === "/posts/1/flag") { state.flags++; data = { needsReview: true }; }
    else if (p === "/posts") data = [state.post];
    else if (p === "/posts/1") data = state.post;
    await route.fulfill({ json: data, headers: { "X-Total-Count": "1" } });
  });
  return state;
}

test("mobile job cards open a full detail and search controls stack", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile");
  await setup(page); await page.goto("/jobs");
  await expect(page.locator(".job-search-preview")).toHaveCount(0);
  const inputs = page.locator(".job-search-form input");
  const first = await inputs.nth(0).boundingBox(), second = await inputs.nth(1).boundingBox();
  expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
  await page.locator(".job-list-card").click();
  await expect(page).toHaveURL(/\/jobs\/1$/);
  await expect(page.locator("h1")).toHaveText(job.title);
});

test("application details return to applications with named skill points", async ({ page }) => {
  await setup(page); await page.goto("/my-applications");
  await expect(page.locator(".app-card-match")).toContainText("1 / 2 แต้มทักษะ");
  await expect(page.locator(".app-match-tags")).toContainText("การบริการลูกค้า · 1 แต้ม");
  await page.locator(".app-card-detail-btn").click();
  await page.reload();
  await expect(page.locator(".page-back")).toHaveAttribute("href", "/my-applications");
  await page.locator(".page-back").click();
  await expect(page).toHaveURL(/\/my-applications$/);
});

test("community reactions preserve author and sync desktop list with detail", async ({ page }, info) => {
  const state = await setup(page); await page.goto("/community");
  const card = page.locator(".community-list > .post-card").first();
  await card.locator(".post-card-like-button").click();
  await expect(card).toContainText("1 กำลังใจ");
  await expect(card.locator(".post-card-author-name")).toHaveText(author.name);
  if (info.project.name !== "mobile") {
    await expect(page.locator(".community-detail-sidebar .post-card-like-button")).toContainText("1 กำลังใจ");
    await page.locator(".community-detail-sidebar .post-card-like-button").click();
  } else await card.locator(".post-card-like-button").click();
  await expect(card).toContainText("0 กำลังใจ");
  expect(state.likeCalls).toBe(2);
});

test("community comments open a mobile detail and reporting uses a dialog", async ({ page }, info) => {
  const state = await setup(page); await page.goto("/community");
  if (info.project.name === "mobile") {
    await expect(page.locator(".community-detail-sidebar")).toHaveCount(0);
    await page.locator(".community-list .post-card-comments-button").click();
    await expect(page).toHaveURL(/\/community\/1$/);
  } else await page.goto("/community/1");
  await page.getByRole("button", { name: "รายงานเนื้อหา", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(state.flags).toBe(0);
  await page.getByRole("button", { name: "ส่งรายงาน", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "รายงานแล้ว", exact: true })).toBeDisabled();
  expect(state.flags).toBe(1);
});

test("failed encouragement can be retried without losing the author", async ({ page }) => {
  await setup(page, { failLike: true }); await page.goto("/community/1");
  await page.locator(".post-card-like-button").click();
  await expect(page.getByRole("alert")).toContainText("ส่งกำลังใจไม่สำเร็จ");
  await expect(page.locator(".post-card-like-button")).toBeEnabled();
  await expect(page.locator(".post-card-author-name")).toHaveText(author.name);
});

test("rapid encouragement taps send a single request", async ({ page }) => {
  const state = await setup(page, { delayLike: true }); await page.goto("/community/1");
  const button = page.locator(".post-card-like-button");
  await button.evaluate(element => { for (let i = 0; i < 5; i++) element.click(); });
  await expect(button).toHaveAttribute("aria-pressed", "true");
  expect(state.likeCalls).toBe(1);
});

test("notifications mark all read, persist, and clear only after confirmation", async ({ page }) => {
  const state = await setup(page, { notifications: [{ _id: "n1", type: "counselling", message: "มีข้อความใหม่", status: "unread", link: "/counselling/s1", createdAt: today }] });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "การแจ้งเตือน", exact: true }).click();
  await page.getByRole("button", { name: "อ่านทั้งหมด", exact: true }).click();
  await expect(page.locator(".notification-bell-panel li.unread")).toHaveCount(0);
  await expect(page.locator(".notification-bell-panel li")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: "การแจ้งเตือน", exact: true }).click();
  await expect(page.getByRole("button", { name: "อ่านทั้งหมด", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "ล้างรายการแจ้งเตือน", exact: true }).click();
  expect(state.notifications).toHaveLength(1);
  await page.getByRole("dialog").getByRole("button", { name: "ยกเลิก", exact: true }).click();
  expect(state.notifications).toHaveLength(1);
  await page.getByRole("button", { name: "การแจ้งเตือน", exact: true }).click();
  await page.getByRole("button", { name: "ล้างรายการแจ้งเตือน", exact: true }).click();
  await page.getByRole("button", { name: "ล้างรายการ", exact: true }).click();
  expect(state.notifications).toHaveLength(0);
});

test("news notification scrolls directly to its article", async ({ page }) => {
  await setup(page, { notifications: [{ _id: "news1", type: "news", message: "ข่าวใหม่", status: "unread", link: "/#news-article1", createdAt: today }] });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "การแจ้งเตือน", exact: true }).click();
  await page.locator(".notification-bell-panel li").click();
  await expect(page).toHaveURL(/#news-article1$/);
  await expect(page.locator("#news-article1")).toBeInViewport();
});

test("calendar has day numbers, check-in detail and bounded month navigation", async ({ page }, info) => {
  await setup(page); await page.goto("/streak");
  await expect(page.locator(".points-summary")).toContainText("75 แต้ม");
  await expect(page.locator(".mission-total")).toContainText("25 / 75 แต้ม");
  await page.locator(".checkin-day.done").click();
  await expect(page.locator(".checkin-calendar-detail")).toContainText("เช็คอินแล้ว");
  await expect(page.getByRole("button", { name: "เดือนถัดไป" })).toBeDisabled();
  for (let i = 0; i < 3 && await page.getByRole("button", { name: "เดือนก่อนหน้า" }).isEnabled(); i++) await page.getByRole("button", { name: "เดือนก่อนหน้า" }).click();
  await expect(page.getByRole("button", { name: "เดือนก่อนหน้า" })).toBeDisabled();
  await page.screenshot({ path: info.outputPath("calendar.png"), fullPage: true });
});

test("profile features a large avatar, actual recovery date and points", async ({ page }, info) => {
  await setup(page); await page.goto("/profile");
  await expect(page.locator(".profile-recovery")).toContainText("1/1/2568");
  await expect(page.locator(".points-summary")).toContainText("75 แต้ม");
  const avatar = await page.locator(".profile-banner-avatar").boundingBox();
  expect(avatar.width).toBeGreaterThanOrEqual(128);
  await page.screenshot({ path: info.outputPath("profile.png"), fullPage: true });
});

test("counselling starts with a request and a descriptive mood dropdown", async ({ page }, info) => {
  await setup(page); await page.goto("/counselling");
  await expect(page.locator(".counselling-layout > :first-child .counselling-form")).toBeVisible();
  const select = page.getByRole("combobox", { name: "ตอนนี้คุณรู้สึกอย่างไร" });
  await select.selectOption("anxious");
  await expect(page.locator(".mood-select p")).toContainText("กังวลใจ ไม่สบายใจ");
  await expect(page.locator(".mood-select svg")).toBeVisible();
  const form = await page.locator(".counselling-form").boundingBox(), history = await page.getByRole("heading", { name: "คำขอที่ผ่านมา" }).boundingBox();
  expect(history.y).toBeGreaterThan(form.y + form.height);
  await page.screenshot({ path: info.outputPath("counselling.png"), fullPage: true });
});

test("mobile emotion recording precedes history", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile");
  await setup(page); await page.goto("/craving-tracker");
  const form = await page.locator(".craving-tracker-form").boundingBox(), history = await page.getByRole("heading", { name: "ประวัติการบันทึก" }).boundingBox();
  expect(form.y + form.height).toBeLessThan(history.y);
});

for (const status of ["pending", "interview", "passed", "rejected", "cancelled"]) test(`job detail shows a distinct ${status} application status`, async ({ page }) => {
  await setup(page, { status }); await page.goto("/jobs/1");
  await expect(page.locator(`.application-tone-${status}`)).toBeVisible();
  await expect(page.getByRole("button", { name: "สมัครงาน", exact: true })).toHaveCount(0);
});

test("closed jobs do not offer an application", async ({ page }) => {
  await setup(page, { noApplication: true, job: { status: "closed" } }); await page.goto("/jobs/1");
  await expect(page.locator(".job-availability-note")).toContainText("ปิดรับสมัครแล้ว");
  await expect(page.getByRole("button", { name: "สมัครงาน", exact: true })).toHaveCount(0);
});

for (const url of ["/dashboard", "/profile", "/jobs", "/counselling", "/craving-tracker", "/community", "/my-applications", "/streak"]) test(`handheld content fits at 320px: ${url}`, async ({ page }, info) => {
  test.skip(info.project.name !== "mobile");
  await setup(page); await page.setViewportSize({ width: 320, height: 780 }); await page.goto(url);
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("#main-content .spin")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  if (url === "/dashboard") await page.screenshot({ path: info.outputPath("dashboard-320.png"), fullPage: true });
});

test("new counselling request works when history fails and the mobile date picker fits", async ({ page }, info) => {
  await setup(page);
  await page.route("**/api/counselling/me", route => route.fulfill({ status: 500, json: { message: "history unavailable" } }));
  let sent;
  await page.route("**/api/counselling", route => {
    sent = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { ...sent, _id: "new-session", createdAt: today, status: "pending" } });
  });
  if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 780 });
  await page.goto("/counselling");
  await expect(page.locator(".counselling-form")).toBeVisible();
  await page.locator('input[name="topic"]').fill("ต้องการคนรับฟัง");
  await page.locator('textarea[name="message"]').fill("อยากคุยเรื่องการทำงาน");
  await page.getByRole("combobox", { name: "ตอนนี้คุณรู้สึกอย่างไร" }).selectOption("stressed");
  await page.locator(".datetime-picker-trigger").click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole("button", { name: "เดือนถัดไป" }).click();
  await page.locator(".datetime-picker-grid button").first().click();
  await page.getByRole("button", { name: "ตกลง", exact: true }).click();
  await page.getByRole("button", { name: "ส่งคำขอ", exact: true }).click();
  await expect(page.locator(".counselling-sent")).toContainText("ส่งคำขอแล้ว");
  await expect(page.getByRole("link", { name: "ติดตามคำขอนี้" })).toHaveAttribute("href", "/counselling/new-session");
  expect(sent.mood).toBe("stressed");
  expect(new Date(sent.preferredAt).getTime()).toBeGreaterThan(Date.now());
});