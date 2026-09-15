import { test, expect } from "@playwright/test";

const account = { _id: "family1", role: "family", name: "ครอบครัว ใจดี", email: "family@example.com", verifiedStatus: "pending" };
const invitation = "/family/accept?token=test-token&email=family%40example.com";
async function fixture(page, signedIn = false) {
  const state = { signedIn, linked: false, registration: null };
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.route("https://fonts.gstatic.com/**", route => route.abort());
  await page.route("**/socket.io/**", route => route.abort());
  await page.route("**/api/**", async route => {
    const p = new URL(route.request().url()).pathname.replace("/api", "");
    let data = [];
    if (p === "/auth/me") {
      if (!state.signedIn) return route.fulfill({ status: 401, json: {} });
      data = account;
    } else if (p === "/auth/register/request-otp") { state.registration = route.request().postDataJSON(); data = {}; }
    else if (["/auth/register/verify-otp", "/auth/login"].includes(p)) { state.signedIn = true; data = { user: account, token: "test-token" }; }
    else if (p === "/family/accept") { state.linked = true; data = { _id: "link1", status: "active" }; }
    else if (p === "/family/links") data = state.linked ? [{ _id: "link1", recoveringUser: { name: "สมาชิกครอบครัว" } }] : [];
    else if (p === "/family/links/link1/summary") data = { name: "สมาชิกครอบครัว", currentStreak: 3, longestStreak: 7, completedMissions: 2, currentStageLabel: "ต้นอ่อนกำลังโต", rewardsEarned: [] };
    await route.fulfill({ json: data });
  });
  return state;
}
async function completeRegistration(page) {
  await page.locator('input[name="name"]').fill(account.name);
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill("password123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "ขอรหัส OTP เพื่อสมัครสมาชิก" }).click();
  await page.getByLabel("รหัส OTP", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "ยืนยันและสมัครสมาชิก" }).click();
}

test("family can register without job fields and land on family onboarding", async ({ page }, info) => {
  const state = await fixture(page);
  if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 780 });
  await page.goto("/register");
  await page.getByRole("radio", { name: "ครอบครัว/ผู้ดูแล" }).click();
  await expect(page.locator('input[name="education"], input[name="companyName"]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await completeRegistration(page);
  expect(state.registration.role).toBe("family");
  await expect(page).toHaveURL(/\/family\/dashboard$/);
  await expect(page.getByRole("heading", { name: "ยังไม่ได้เชื่อมกับสมาชิกในครอบครัว" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "ติดตามครอบครัว", exact: true })).toBeVisible();
});

test("invitation survives family registration until explicit acceptance", async ({ page }) => {
  const state = await fixture(page); await page.goto(invitation);
  await page.locator(".family-accept-actions").getByRole("link", { name: "สมัครสมาชิก", exact: true }).click();
  await expect(page.getByRole("radio", { name: "ครอบครัว/ผู้ดูแล" })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator('input[name="email"]')).toHaveValue(account.email);
  await completeRegistration(page);
  await expect(page).toHaveURL(new RegExp("/family/accept\\?token=test-token"));
  expect(state.linked).toBe(false);
  await page.getByRole("button", { name: "ยืนยันคำเชิญ", exact: true }).click();
  await expect(page).toHaveURL(/\/family\/dashboard$/);
  await expect(page.getByRole("heading", { name: "สมาชิกครอบครัว", exact: true })).toBeVisible();
});

test("existing family login returns to the invitation", async ({ page }) => {
  await fixture(page); await page.goto(invitation);
  await page.locator(".family-accept-actions").getByRole("link", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("password123");
  await page.locator(".login-form").getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.getByRole("button", { name: "ยืนยันคำเชิญ", exact: true })).toBeVisible();
});

test("family profile and navigation use the family role and exclude patient-only screens", async ({ page }, info) => {
  await fixture(page, true); await page.goto("/profile");
  await expect(page.locator(".profile-role-badge")).toHaveText("ครอบครัว/ผู้ดูแล");
  await expect(page.locator(".profile-recovery, .profile-skills-card")).toHaveCount(0);
  if (info.project.name === "mobile") await page.getByRole("button", { name: "เปิดเมนู", exact: true }).click();
  const nav = info.project.name === "mobile" ? page.locator("#mobile-navigation") : page.locator(".secondary-nav");
  await expect(nav.getByRole("link", { name: "ติดตามครอบครัว", exact: true })).toBeVisible();
  await expect(nav.locator('a[href="/craving-tracker"]')).toHaveCount(0);
  await page.goto("/craving-tracker");
  await expect(page).toHaveURL(/\/$/);
});
