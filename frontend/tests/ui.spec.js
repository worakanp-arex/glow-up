import { test, expect } from "@playwright/test";

const user = { _id: "507f1f77bcf86cd799439011", name: "ก้าวใหม่ ใจดี", email: "test@example.com", role: "user", verifiedStatus: "verified", certificates: [] };
const employer = { ...user, role: "employer", companyName: "บริษัท โอกาสใหม่ จำกัด" };
const jobs = Array.from({ length: 23 }, (_, i) => ({ _id: String(i + 1), title: `เจ้าหน้าที่ดูแลลูกค้า ${i + 1}`, description: "ร่วมเติบโตไปกับทีมที่พร้อมให้โอกาสและสนับสนุนการเรียนรู้", employer, location: "ขอนแก่น", salary: 18000, skills: [], verifiedStatus: "verified", status: "open", attachmentRequests: [] }));
const streak = { currentStreak: 3, longestStreak: 7, totalCheckIns: 10, loggedToday: false, history: [] };
const summary = { activeUsers: { count: 12 }, risk: { byLevel: { low: 10, medium: 2, high: 0 } }, appointments: { today: 0, byDay: [] }, loginTrend: [], leaderboard: [] };

async function fixture(page, role = "user", options = {}) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.route("**/socket.io/**", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname.replace("/api", "");
    let data = [];
    if (options.failDetail === p) return route.fulfill({ status: 404, json: { message: "ไม่พบข้อมูลที่ต้องการ" } });
    if (options.blockApplicants && p.startsWith("/applications/") && p !== "/applications/me") return route.fulfill({ status: 403, json: { message: "ยังไม่ได้ยืนยันบัญชี" } });
    if (p === "/auth/me") {
      if (role === "guest") return route.fulfill({ status: 401, json: { message: "Unauthorized" } });
      data = { ...user, role };
    } else if (p === "/news") data = { articles: [] };
    else if (p === "/applications/me") data = Array.from({ length: 12 }, (_, i) => ({ _id: `application-${i}`, job: jobs[i], status: "pending", appliedAt: "2026-09-01T00:00:00Z", match: { score: 50, matchedSkills: ["Customer service"], missingSkills: ["Computer"], totalSkills: 2 } }));
    else if (p === "/emotion/streak") data = streak;
    else if (p === "/courses/1") data = { _id: "1", title: "เตรียมความพร้อมสู่การทำงานและพัฒนาทักษะในชีวิตประจำวัน", description: "เรียนรู้ไปทีละขั้น", tags: [], externalUrl: "https://example.com/course" };
    else if (p === "/micro-lessons/1") data = { _id: "1", title: "ทักษะการสื่อสาร", body: "ฝึกสื่อสารอย่างมั่นใจ" };
    else if (p === "/scenarios/1") data = { _id: "1", title: "ฝึกการปฏิเสธ", prompt: "เลือกคำตอบที่เหมาะสม", options: [{ text: "ขอปฏิเสธ" }, { text: "ขอคิดดูก่อน" }] };
    else if (p === "/posts/1") data = { _id: "1", user, content: "แบ่งปันกำลังใจ", tags: [], comments: [], likes: 0, createdAt: "2026-09-01T00:00:00Z" };
    else if (p === "/users/1/public") data = { ...user, role: "counsellor", specialization: "การให้คำปรึกษา" };
    else if (p === "/applications/1") data = { _id: "1", user, job: jobs[0], status: "pending", attachments: [] };
    else if (p === "/counselling/patients/1") data = { user, rehabRecords: [], riskAssessments: [], emotionStreak: streak, emotionLogs: [] };
    else if (p === "/counselling/1") data = { _id: "1", user, topic: "ขอคำปรึกษาเพื่อเตรียมความพร้อมในการทำงาน", message: "ต้องการพูดคุย", messages: [], sessionType: "chat", status: "pending", createdAt: "2026-09-01T00:00:00Z" };
    else if (p === "/emotion/1/streak") data = { ...streak, user };
    else if (p === "/overview") data = summary;
    else if (p === "/risk/all") data = summary.risk;
    else if (p === "/admin/dashboard") data = { users: { total: 12, employers: 3, pendingVerifications: 2 }, jobs: { total: 23, pending: 2, open: 21 }, applications: { total: 0, byStatus: {} }, risk: summary.risk };
    else if (p === "/users") data = Array.from({ length: 23 }, (_, i) => ({ ...user, _id: String(i), name: `สมาชิก ${i + 1}` }));
    else if (["/jobs", "/jobs/mine", "/jobs/admin/all"].includes(p)) {
      if (options.failJobs) return route.fulfill({ status: 500, json: { message: "โหลดรายการไม่สำเร็จ" } });
      const start = ((Number(url.searchParams.get("page")) || 1) - 1) * (Number(url.searchParams.get("limit")) || 10);
      data = url.searchParams.has("page") ? jobs.slice(start, start + (Number(url.searchParams.get("limit")) || 10)) : jobs;
    } else if (/^\/jobs\/\d+$/.test(p)) data = jobs[0];
    else if (p === "/family/links" && options.family) data = [{ _id: "link1", recoveringUser: user }];
    else if (p === "/family/links/link1/summary") data = { name: user.name, currentStreak: 3, longestStreak: 7, currentStageLabel: "ต้นอ่อนกำลังโต", completedMissions: 2, rewardsEarned: [] };
    await route.fulfill({ json: data, headers: { "X-Total-Count": String(jobs.length) } });
  });
}

const pages = {
  guest: ["/", "/about", "/login", "/register", "/forgot-password", "/reset-password", "/jobs", "/family/accept", "/not-a-page"],
  user: ["/dashboard", "/profile", "/my-applications", "/craving-tracker", "/streak", "/weekly-checkin", "/learning", "/community", "/community/saved", "/courses", "/counselling", "/jobs"],
  employer: ["/employer/dashboard", "/employer/jobs", "/employer/jobs/new", "/employer/jobs/1/applicants", "/profile"],
  counsellor: ["/counsellor", "/counsellor/courses", "/counsellor/lessons", "/counsellor/analytics", "/community/mine", "/admin/posts-moderation"],
  admin: ["/admin", "/admin/users", "/admin/jobs", "/admin/job-categories", "/admin/assessments", "/admin/posts-moderation"],
};
for (const [role, routes] of Object.entries(pages)) {
  for (const url of routes) test(`${role} ${url}`, async ({ page }, testInfo) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await fixture(page, role);
    await page.goto(url);
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.locator(url === "/not-a-page" ? "#main-content .async-state h2" : "#main-content h1").first()).toBeVisible();
    await expect(page.locator("#main-content .async-state .spin")).toHaveCount(0);
    await expect(page.locator("#main-content h1")).toHaveCount(1);
    await expect(page.locator("#main-content .page-heading-icon > svg")).toHaveCount(1);
    await expect(page.locator(".workspace-sidebar")).toHaveCount(0);
    if (testInfo.project.name === "mobile") {
      await expect(page.locator(".secondary-nav")).toBeHidden();
      await expect(page.getByRole("button", { name: "เปิดเมนู", exact: true })).toBeVisible();
    } else {
      await expect(page.locator(".secondary-nav")).toBeVisible();
      await expect(page.locator(".navbar-menu-toggle")).toBeHidden();
    }
    await expect(page.getByText("หน้านี้ยังเปิดไม่ได้", { exact: true })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
    if (["/", "/dashboard", "/admin/users", "/jobs", "/login"].includes(url)) await page.screenshot({ path: testInfo.outputPath("preview.png"), fullPage: true, animations: "disabled" });
  });
}
test("family dashboard", async ({ page }) => {
  await fixture(page, "user", { family: true }); await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "ติดตามความคืบหน้า" })).toBeVisible();
});
test("failed request has a retry action", async ({ page }) => {
  await fixture(page, "user", { failJobs: true }); await page.goto("/jobs");
  await expect(page.getByRole("button", { name: "ลองอีกครั้ง", exact: true })).toBeVisible();
});
test("mobile navigation closes with Escape", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await fixture(page); await page.goto("/dashboard");
  await page.getByRole("button", { name: "เปิดเมนู", exact: true }).click();
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-navigation")).toHaveCount(0);
});
test("job results paginate without losing the total", async ({ page }) => {
  await fixture(page, "guest"); await page.goto("/jobs");
  await expect(page.locator(".job-list-card")).toHaveCount(10);
  await page.getByRole("button", { name: "หน้าถัดไป" }).click();
  await expect(page.locator(".job-list-card").first()).toContainText("เจ้าหน้าที่ดูแลลูกค้า 11");
  await expect(page.locator(".job-search-result-count")).toContainText("23");
});

test("admin users can move between result pages", async ({ page }) => {
  await fixture(page, "admin"); await page.goto("/admin/users");
  await expect(page.locator(".users-list > li")).toHaveCount(10);
  await page.getByRole("button", { name: "หน้าถัดไป" }).click();
  await expect(page.locator(".users-list > li").first()).toContainText("สมาชิก 11");
});

test("application cards show the supplied skill match", async ({ page }) => {
  await fixture(page); await page.goto("/my-applications");
  await expect(page.locator(".my-applications-list > li")).toHaveCount(10);
  await expect(page.locator(".app-card-match").first()).toContainText("50%");
  await expect(page.locator(".app-card-match").first()).toContainText("1 / 2 แต้มทักษะ");
  await expect(page.locator(".app-card-match").first()).toContainText("Customer service");
});

for (const width of [320, 360, 430]) test(`mobile home at ${width}px keeps primary actions in the first screen`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await fixture(page, "guest");
  await page.setViewportSize({ width, height: 780 });
  await page.goto("/");
  await expect(page.locator(".home-hero-actions").first()).toBeInViewport({ ratio: 1 });
  await expect(page.locator(".home-hero-visual")).toBeInViewport({ ratio: 1 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), animations: "disabled" });
});
test("mobile drawer closes when switching to desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await fixture(page); await page.goto("/dashboard");
  await page.getByRole("button", { name: "เปิดเมนู", exact: true }).click();
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator("#mobile-navigation")).toHaveCount(0);
  await expect(page.locator(".secondary-nav")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
});

test("account menu retains the activity links", async ({ page }) => {
  await fixture(page); await page.goto("/dashboard");
  await page.getByRole("button", { name: "เมนูบัญชีของฉัน" }).click();
  for (const href of ["/my-applications", "/weekly-checkin", "/learning", "/streak"]) {
    await expect(page.locator(`.user-menu-panel a[href="${href}"]`)).toBeVisible();
  }
});

const details = [
  ["guest", "/jobs/1", "/jobs"],
  ["user", "/courses/1", "/courses"],
  ["user", "/learning/1", "/learning"],
  ["user", "/learning/scenarios/1", "/learning"],
  ["user", "/community/1", "/community"],
  ["user", "/community/staff/1", "/community"],
  ["user", "/counselling/1", "/counselling"],
  ["counsellor", "/counsellor/requests/1", "/counsellor"],
  ["counsellor", "/counsellor/patients/1", "/counsellor"],
  ["admin", "/admin/users/1/emotion", "/admin/users"],
  ["employer", "/employer/applications/1", "/employer/jobs/1/applicants"],
  ["employer", "/employer/jobs/1/applicants", "/employer/jobs"],
  ["employer", "/employer/jobs/new", "/employer/jobs"],
];
for (const [role, url, parent] of details) test(`detail header and back ${role} ${url}`, async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await fixture(page, role); await page.goto(url);
  await expect(page.locator("#main-content .page-header h1")).toBeVisible();
  await expect(page.locator("#main-content .async-state .spin")).toHaveCount(0);
  if (url === "/community/1") await expect(page.locator(".post-card")).toBeVisible();
  await expect(page.locator("#main-content h1")).toHaveCount(1);
  await expect(page.locator("#main-content .page-heading-icon > svg")).toHaveCount(1);
  await expect(page.locator("#main-content .page-back")).toHaveCount(1);
  await expect(page.locator(".page-back")).toHaveAttribute("href", parent);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
  if (["/courses/1", "/employer/applications/1", "/employer/jobs/new", "/counselling/1"].includes(url)) await page.screenshot({ path: testInfo.outputPath("preview.png"), animations: "disabled" });
  await page.locator(".page-back").click();
  await expect(page).toHaveURL(new URL(parent, "http://127.0.0.1:5173").href);
});

test("missing details retain a heading and a safe way back", async ({ page }) => {
  await fixture(page, "guest", { failDetail: "/jobs/1" }); await page.goto("/jobs/1");
  await expect(page.locator(".page-header h1")).toHaveText("รายละเอียดงาน");
  await expect(page.getByRole("button", { name: "ลองอีกครั้ง", exact: true })).toBeVisible();
  await page.locator(".page-back").click();
  await expect(page).toHaveURL(/\/jobs$/);
});

test("restricted applicant details keep the shared header and back link", async ({ page }) => {
  await fixture(page, "employer", { blockApplicants: true }); await page.goto("/employer/applications/1");
  await expect(page.locator(".applicant-detail-verification-pending")).toBeVisible();
  await expect(page.locator(".page-header h1")).toHaveText("รายละเอียดผู้สมัครงาน");
  await expect(page.locator(".page-back")).toHaveAttribute("href", "/employer/jobs");
});

test("OTP header back action preserves registration details", async ({ page }) => {
  await fixture(page, "guest"); await page.goto("/register");
  await page.locator('input[name="name"]').fill("ผู้ทดสอบ");
  await page.locator('input[name="email"]').fill("header-test@example.com");
  await page.locator('input[name="password"]').fill("test-password-only");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "ขอรหัส OTP เพื่อสมัครสมาชิก", exact: true }).click();
  await expect(page.locator(".page-title")).toHaveText("ยืนยันอีเมล");
  await page.getByRole("button", { name: "ย้อนกลับไปข้อมูลสมัครสมาชิก" }).click();
  await expect(page.locator(".page-title")).toHaveText("สมัครสมาชิก");
  await expect(page.locator('input[name="name"]')).toHaveValue("ผู้ทดสอบ");
  await expect(page.locator('input[name="email"]')).toHaveValue("header-test@example.com");
});

test("header actions open the related creation forms", async ({ page }) => {
  await fixture(page, "employer"); await page.goto("/employer/jobs");
  await page.locator(".page-header-actions").getByRole("link", { name: "สร้างประกาศงานใหม่" }).click();
  await expect(page).toHaveURL(/\/employer\/jobs\/new$/);
  await fixture(page, "counsellor"); await page.goto("/community");
  await page.locator(".page-header-actions").getByRole("button", { name: "เขียนโพสต์ให้ความรู้" }).click();
  await expect(page.locator(".community-composer textarea")).toBeFocused();
});
