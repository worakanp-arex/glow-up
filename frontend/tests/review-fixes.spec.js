import { test, expect } from "@playwright/test";

const employer = { _id: "e1", name: "คุณวิชัย", email: "boss@example.com", role: "employer", verifiedStatus: "verified", companyName: "บริษัท ตัวอย่าง" };
const applicant = { _id: "u1", name: "ก้าวใหม่ ใจดี", email: "seeker@example.com", verifiedStatus: "verified" };
const job = { _id: "j1", title: "พนักงานคัดแยกพัสดุ", employer: "e1", location: "ขอนแก่น", salary: 11500, description: "คัดแยกพัสดุ" };
const match = { score: 67, matchedSkills: ["งานคลังสินค้า", "การตรงต่อเวลา"], missingSkills: ["งานแพ็คและจัดส่ง"], totalSkills: 3 };

async function setup(page, role, extra = {}) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.route("**/socket.io/**", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api", "");
    const method = route.request().method();
    if (path === "/auth/me") return route.fulfill({ json: role === "employer" ? employer : { ...applicant, role } });
    if (extra[`${method} ${path}`]) return route.fulfill(extra[`${method} ${path}`]);
    return route.fulfill({ json: [], headers: { "X-Total-Count": "0" } });
  });
}

test("the skill match stays on screen after the employer saves a new status", async ({ page }) => {
  const loaded = { _id: "a1", user: applicant, job, status: "pending", attachments: [], match };
  // เซิร์ฟเวอร์ส่งใบสมัครที่บันทึกแล้วกลับมาโดยไม่มี match (คำนวณเฉพาะตอนโหลด)
  const { match: _omit, ...savedWithoutMatch } = { ...loaded, status: "interview" };
  await setup(page, "employer", {
    "GET /applications/a1": { json: loaded },
    "PUT /applications/a1/status": { json: savedWithoutMatch },
  });
  await page.goto("/employer/applications/a1");

  const card = page.locator(".applicant-detail-match-card");
  await expect(card).toContainText("67%");
  await page.getByLabel("สถานะใบสมัคร").selectOption("interview");
  await page.getByRole("button", { name: /บันทึก/ }).click();
  await expect(page.getByRole("status")).toContainText("บันทึกแล้ว");
  await expect(card).toContainText("67%");
  await expect(card).not.toContainText("งานนี้ไม่ได้ระบุทักษะที่ต้องการ");
});

test("another employer's application says so instead of claiming the account is unverified", async ({ page }) => {
  await setup(page, "employer", { "GET /applications/a1": { status: 403, json: { message: "Forbidden" } } });
  await page.goto("/employer/applications/a1");
  await expect(page.getByText("คุณไม่มีสิทธิ์ดูใบสมัครนี้")).toBeVisible();
  await expect(page.getByText("บัญชีนายจ้างของคุณยังไม่ได้รับการยืนยันตัวตน")).toHaveCount(0);
});

test("the refusal-practice link only shows for learners, who are the only ones allowed in", async ({ page }) => {
  await setup(page, "employer");
  await page.goto("/courses");
  await expect(page.locator(".courses-page")).toBeVisible();
  await expect(page.getByText("ฝึกทักษะการปฏิเสธ")).toHaveCount(0);
});

test("a failed bookmark tells the learner instead of failing silently", async ({ page }) => {
  const course = { _id: "c1", title: "คอร์สตัวอย่าง", description: "เรียนรู้", category: "สุขภาพ", tags: [], externalUrl: "https://learn.example/1" };
  await setup(page, "user", {
    "GET /courses": { json: [course], headers: { "X-Total-Count": "1" } },
    "POST /courses/c1/enroll": { status: 500, json: { message: "บันทึกคอร์สไม่สำเร็จ ลองใหม่อีกครั้ง" } },
  });
  await page.goto("/courses");
  await page.getByRole("button", { name: "บันทึกคอร์สนี้" }).click();
  await expect(page.locator(".courses-save-error")).toContainText("บันทึกคอร์สไม่สำเร็จ");
  await expect(page.getByRole("button", { name: "บันทึกคอร์สนี้" })).toBeEnabled();
});
