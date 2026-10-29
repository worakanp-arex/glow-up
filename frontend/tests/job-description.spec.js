import { test, expect } from "@playwright/test";

const employer = { _id: "e1", name: "คุณวิชัย", companyName: "บริษัท ขอนแก่นโลจิสติกส์ เซอร์วิส จำกัด", role: "employer", verifiedStatus: "verified" };
const DESCRIPTION = [
  "คัดแยกและตรวจสอบพัสดุก่อนส่งต่อไปยังสายส่งแต่ละพื้นที่",
  "ไม่จำเป็นต้องมีประสบการณ์",
  "หน้าที่หลัก:",
  "- สแกนบาร์โค้ดแล้ววางพัสดุลงช่องตามรหัสปลายทาง",
  "- ลำเลียงพัสดุขึ้นรถตามรอบ",
  "คุณสมบัติและสิ่งที่ต้องทำได้:",
  "- ยกกล่องน้ำหนักไม่เกิน 15 กิโลกรัมได้ต่อเนื่องตลอดกะ",
  "- ทำงานกะหมุนเวียนได้",
  "- เข้างานตรงเวลาทุกวัน",
  "สวัสดิการและเงื่อนไข:",
  "- ประกันสังคมตั้งแต่วันแรก",
  "- หยุดสัปดาห์ละ 1 วัน",
].join("\n");

async function openJob(page, job) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.route("**/socket.io/**", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api", "");
    if (path === "/auth/me") return route.fulfill({ status: 401, json: { message: "Unauthorized" } });
    if (path === "/jobs/1") return route.fulfill({ json: job });
    return route.fulfill({ json: [] });
  });
  await page.goto("/jobs/1");
}

const baseJob = { _id: "1", title: "พนักงานคัดแยกพัสดุ", employer, location: "ขอนแก่น", salary: 11500, skills: [], verifiedStatus: "verified", status: "open", attachmentRequests: [] };

test("job detail shows duties, requirements and benefits as separate lists", async ({ page }, testInfo) => {
  await openJob(page, { ...baseJob, description: DESCRIPTION });

  const section = (title) => page.locator(".job-preview-section", { has: page.getByRole("heading", { name: title, exact: true }) });
  await expect(section("เกี่ยวกับงานนี้").locator("p")).toHaveCount(2);
  await expect(section("หน้าที่หลัก").locator("li")).toHaveCount(2);
  await expect(section("คุณสมบัติและสิ่งที่ต้องทำได้").locator("li")).toHaveCount(3);
  await expect(section("สวัสดิการและเงื่อนไข").locator("li")).toHaveCount(2);
  await expect(section("คุณสมบัติและสิ่งที่ต้องทำได้")).toContainText("ยกกล่องน้ำหนักไม่เกิน 15 กิโลกรัม");
  // หัวข้อและเครื่องหมาย "-" ต้องไม่หลุดออกมาเป็นข้อความดิบ
  await expect(page.locator(".job-preview")).not.toContainText("หน้าที่หลัก:");
  await expect(page.locator(".job-preview")).not.toContainText("- สแกนบาร์โค้ด");
  await page.screenshot({ path: testInfo.outputPath("job-detail.png"), fullPage: true, animations: "disabled" });
});

test("the original-posting link appears only when the job has one", async ({ page }) => {
  await openJob(page, { ...baseJob, description: DESCRIPTION });
  await expect(page.locator(".job-preview-section").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "ดูประกาศต้นฉบับ" })).toHaveCount(0);

  await page.unroute("**/api/**");
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api", "");
    if (path === "/auth/me") return route.fulfill({ status: 401, json: { message: "Unauthorized" } });
    if (path === "/jobs/1") return route.fulfill({ json: { ...baseJob, description: DESCRIPTION, externalUrl: "https://careers.example/jobs/1" } });
    return route.fulfill({ json: [] });
  });
  await page.reload();
  await expect(page.getByRole("link", { name: "ดูประกาศต้นฉบับ" })).toHaveAttribute("href", "https://careers.example/jobs/1");
});

test("an old-style posting with only dashed lines still shows its duties", async ({ page }) => {
  await openJob(page, { ...baseJob, description: "ร่วมงานกับเรา\n- ขายของหน้าร้าน\n- ทอนเงิน" });
  await expect(page.getByRole("heading", { name: "หน้าที่หลัก", exact: true })).toBeVisible();
  await expect(page.locator(".job-preview-section li")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "คุณสมบัติและสิ่งที่ต้องทำได้" })).toHaveCount(0);
});
