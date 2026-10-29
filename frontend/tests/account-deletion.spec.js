import { test, expect } from "@playwright/test";

const person = { _id: "507f1f77bcf86cd799439011", name: "ก้าวใหม่ ใจดี", email: "test@example.com", role: "user", verifiedStatus: "verified", certificates: [] };

async function fixture(page, { deleteStatus = 204, deleteMessage } = {}) {
  const state = { signedIn: true, deleteBody: null, restored: false };
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/socket.io/**", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const p = new URL(request.url()).pathname.replace("/api", "");
    let data = [];
    if (p === "/auth/me") {
      if (!state.signedIn) return route.fulfill({ status: 401, json: {} });
      data = person;
    } else if (p === "/auth/logout") { state.signedIn = false; data = {}; }
    else if (p === "/users/me" && request.method() === "DELETE") {
      state.deleteBody = request.postDataJSON();
      if (deleteStatus !== 204) return route.fulfill({ status: deleteStatus, json: { message: deleteMessage } });
      state.signedIn = false;
      return route.fulfill({ status: 204 });
    } else if (p === "/news") data = { articles: [] };
    await route.fulfill({ json: data });
  });
  return state;
}

async function openDeleteDialog(page) {
  await page.goto("/profile");
  await page.getByRole("tab", { name: "ข้อมูลส่วนตัว" }).click();
  await page.getByRole("button", { name: "ลบบัญชี", exact: true }).click();
  return page.getByRole("dialog");
}

test("deleting your own account needs the address typed, then signs you out", async ({ page }) => {
  const state = await fixture(page);
  const dialog = await openDeleteDialog(page);
  await expect(dialog).toContainText("90 วัน");
  const confirm = dialog.getByRole("button", { name: "ลบบัญชีของฉัน" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("อีเมลของบัญชี").fill("someone-else@example.com");
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("อีเมลของบัญชี").fill("TEST@example.com");
  await dialog.getByLabel("รหัสผ่านปัจจุบัน").fill("my-own-password-123");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  // ออกจากระบบขณะอยู่ในหน้าที่ต้องล็อกอิน แอปจึงส่งผู้ใช้ไปหน้าเข้าสู่ระบบ
  await expect(page).toHaveURL(/\/login$/);
  expect(state.deleteBody).toEqual({ confirmEmail: "TEST@example.com", password: "my-own-password-123" });
  expect(state.signedIn).toBe(false);
  await expect(page.locator(".login-form")).toBeVisible();
});

test("a wrong password keeps the account and the dialog open with the reason", async ({ page }) => {
  const state = await fixture(page, { deleteStatus: 401, deleteMessage: "รหัสผ่านไม่ถูกต้อง" });
  const dialog = await openDeleteDialog(page);
  await dialog.getByLabel("อีเมลของบัญชี").fill("test@example.com");
  await dialog.getByLabel("รหัสผ่านปัจจุบัน").fill("wrong-password-123");
  await dialog.getByRole("button", { name: "ลบบัญชีของฉัน" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("รหัสผ่านไม่ถูกต้อง");
  expect(state.signedIn).toBe(true);
  await expect(page).toHaveURL(/\/profile$/);
});

test("cancelling the dialog deletes nothing", async ({ page }) => {
  const state = await fixture(page);
  const dialog = await openDeleteDialog(page);
  await dialog.getByRole("button", { name: "ยกเลิก" }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.deleteBody).toBeNull();
});
