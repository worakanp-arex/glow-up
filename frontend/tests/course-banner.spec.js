import { test, expect } from "@playwright/test";

const user = { _id: "507f1f77bcf86cd799439011", name: "ก้าวใหม่ ใจดี", email: "test@example.com", role: "user", verifiedStatus: "verified", certificates: [] };
const course = (n, extra = {}) => ({
  _id: `c${n}`, title: `คอร์สตัวอย่าง ${n}`, description: `รายละเอียดของคอร์สตัวอย่าง ${n}`, category: n % 2 ? "สุขภาพ" : "การเงิน", tags: [],
  externalUrl: `https://learn.example/${n}`, coverImage: `/uploads/course-covers/cover-${n}.png`, ...extra,
});
const ALL = [1, 2, 3, 4, 5, 6].map((n) => course(n));

async function setup(page, { motion = "reduce", featured, myCourses = [] } = {}) {
  await page.emulateMedia({ reducedMotion: motion });
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.route("**/socket.io/**", (route) => route.abort());
  // รูปปกจำลอง: PNG 1x1 เพื่อให้โหลดสำเร็จ และนับได้ว่าแบนเนอร์ขอรูปจากพาธที่เจ้าหน้าที่ตั้งไว้
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  await page.route("**/uploads/course-covers/**", (route) => route.fulfill({ body: png, contentType: "image/png" }));
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api", "");
    let data = [];
    if (path === "/auth/me") data = user;
    else if (path === "/courses") data = ALL;
    else if (path === "/courses/mine") data = myCourses;
    else if (path === "/courses/featured") data = featured ?? [];
    await route.fulfill({ json: data, headers: { "X-Total-Count": String(ALL.length) } });
  });
}

const pick = (n, reason) => course(n, { reason });
const FEATURED = [
  pick(3, { source: "skill", label: "งานครัวและประกอบอาหาร", matched: ["ครัว"] }),
  pick(4, { source: "skill-category", label: "ดูแลและสุขภาพ", matched: ["สุขภาพ"] }),
  pick(5, { source: "saved-job", label: "พนักงานเสิร์ฟ", matched: [] }),
  pick(6, { source: "general", label: null, matched: [] }),
];

const visibleTitle = (page) => page.locator(".course-banner-slide.is-active h2");

test("the banner shows the cover staff uploaded and says why a course was picked", async ({ page }) => {
  await setup(page, { featured: FEATURED });
  await page.goto("/courses");

  await expect(page.locator(".course-banner")).toBeVisible();
  await expect(visibleTitle(page)).toHaveText("คอร์สตัวอย่าง 3");
  await expect(page.locator(".course-banner-slide.is-active .course-banner-art img")).toHaveAttribute("src", "/uploads/course-covers/cover-3.png");
  await expect(page.locator(".course-banner-slide.is-active")).toContainText("ตรงกับทักษะที่คุณสนใจ: งานครัวและประกอบอาหาร");
  await expect(page.locator(".course-banner-slide.is-active .ui-btn")).toHaveAttribute("href", "/courses/c3");
  // การ์ตูนมาสคอตเดิมต้องไม่อยู่แล้ว
  await expect(page.locator("img[src*='mascot']")).toHaveCount(0);
});

test("it rotates through several courses by arrows, dots and the keyboard", async ({ page }) => {
  await setup(page, { featured: FEATURED });
  await page.goto("/courses");
  await expect(page.locator(".course-banner-dot")).toHaveCount(4);

  await page.getByRole("button", { name: "คอร์สถัดไป" }).click();
  await expect(visibleTitle(page)).toHaveText("คอร์สตัวอย่าง 4");
  await expect(page.locator(".course-banner-slide.is-active")).toContainText("เหมาะกับสายงานที่คุณสนใจ: ดูแลและสุขภาพ");

  await page.getByRole("button", { name: /ไปยังคอร์สที่ 3/ }).click();
  await expect(visibleTitle(page)).toHaveText("คอร์สตัวอย่าง 5");
  await expect(page.locator(".course-banner-slide.is-active")).toContainText("เพราะคุณบันทึกงาน “พนักงานเสิร์ฟ” ไว้");

  await page.keyboard.press("ArrowRight");
  await expect(visibleTitle(page)).toHaveText("คอร์สตัวอย่าง 6");
  await page.keyboard.press("ArrowRight");
  await expect(visibleTitle(page)).toHaveText("คอร์สตัวอย่าง 3");
  await page.getByRole("button", { name: "คอร์สก่อนหน้า" }).click();
  await expect(visibleTitle(page)).toHaveText("คอร์สตัวอย่าง 6");

  // มีสไลด์เดียวที่เข้าถึงได้ ที่เหลือซ่อนจากโปรแกรมอ่านหน้าจอและการกด Tab
  await expect(page.locator(".course-banner-slide[inert]")).toHaveCount(3);
  await expect(page.locator(".course-banner-slide.is-active")).toHaveAttribute("aria-label", "4 จาก 4");
});

test("a course in progress is the first slide and is not repeated", async ({ page }) => {
  await setup(page, { featured: FEATURED, myCourses: [{ _id: "e1", course: ALL[3], certificateUrl: null }] });
  await page.goto("/courses");
  await expect(visibleTitle(page)).toHaveText("คอร์สตัวอย่าง 4");
  await expect(page.locator(".course-banner-slide.is-active")).toContainText("เรียนต่อจากครั้งที่แล้ว");
  await expect(page.locator(".course-banner-slide.is-active .ui-btn")).toHaveText("เรียนต่อ");
  // featured มี 4 คอร์ส ซึ่งหนึ่งในนั้นคือคอร์สที่กำลังเรียน จึงเหลือ 4 สไลด์ไม่ใช่ 5
  await expect(page.locator(".course-banner-dot")).toHaveCount(4);
});

test("without picks the banner still rotates over open courses, and a single course has no controls", async ({ page }) => {
  await setup(page, { featured: [] });
  await page.goto("/courses");
  await expect(page.locator(".course-banner-dot")).toHaveCount(3);
  await expect(visibleTitle(page)).toHaveText("คอร์สตัวอย่าง 1");

  await page.unroute("**/api/**");
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api", "");
    await route.fulfill({ json: path === "/auth/me" ? user : path === "/courses" ? [ALL[0]] : [] });
  });
  await page.reload();
  await expect(visibleTitle(page)).toHaveText("คอร์สตัวอย่าง 1");
  await expect(page.locator(".course-banner-controls")).toHaveCount(0);
});

test("it advances by itself, pauses on request, and never moves for people who asked for less motion", async ({ page }) => {
  await page.clock.install();
  await setup(page, { motion: "no-preference", featured: FEATURED });
  await page.goto("/courses");
  await expect(visibleTitle(page)).toHaveText("คอร์สตัวอย่าง 3");

  await page.clock.runFor(7000);
  await expect(visibleTitle(page)).toHaveText("คอร์สตัวอย่าง 4");

  await page.getByRole("button", { name: "หยุดเลื่อนอัตโนมัติ" }).click();
  await page.mouse.move(0, 0);
  await page.clock.runFor(20000);
  await expect(visibleTitle(page)).toHaveText("คอร์สตัวอย่าง 4");

  await page.getByRole("button", { name: "เลื่อนอัตโนมัติ" }).click();
  await page.mouse.move(0, 0);
  await page.clock.runFor(7000);
  await expect(visibleTitle(page)).toHaveText("คอร์สตัวอย่าง 5");
});

test("reduced-motion users get a banner that stays put until they move it", async ({ page }) => {
  await page.clock.install();
  await setup(page, { motion: "reduce", featured: FEATURED });
  await page.goto("/courses");
  await expect(visibleTitle(page)).toHaveText("คอร์สตัวอย่าง 3");
  await page.clock.runFor(30000);
  await expect(visibleTitle(page)).toHaveText("คอร์สตัวอย่าง 3");
  // ยังเลือกให้เลื่อนเองได้ด้วยปุ่มเล่น
  await expect(page.getByRole("button", { name: "เลื่อนอัตโนมัติ" })).toBeVisible();
});

test("a cover that fails to load leaves readable text instead of a broken image", async ({ page }) => {
  await setup(page, { featured: FEATURED });
  await page.route("**/uploads/course-covers/cover-3.png", (route) => route.abort());
  await page.goto("/courses");
  await expect(visibleTitle(page)).toHaveText("คอร์สตัวอย่าง 3");
  await expect(page.locator(".course-banner-slide.is-active .course-banner-art")).toHaveCount(0);
  await expect(page.locator(".course-banner-slide.is-active .ui-btn")).toBeVisible();
});
