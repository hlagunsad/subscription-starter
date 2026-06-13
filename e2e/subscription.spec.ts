import { test, expect, type Page } from "@playwright/test";

const PASSWORD = "e2e-test-pw-12345";

// Sign up a fresh account each run. Email confirmation is off, so sign-up logs
// the user straight in — the test is self-contained (no pre-made account needed).
async function signUpFresh(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Need an account? Create one" }).click();
  await page.getByPlaceholder("Email").fill(`e2e.${Date.now()}@example.com`);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  // "Sign out" only renders once authenticated.
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible({ timeout: 20000 });
}

test("a new user starts on the Free plan and sees the upgrade option", async ({ page }) => {
  await signUpFresh(page);
  await expect(page.getByText("Free", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Subscribe to Pro" })).toBeVisible();
});

test("Subscribe hands off to Stripe Checkout", async ({ page }) => {
  await signUpFresh(page);
  await page.getByRole("button", { name: "Subscribe to Pro" }).click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
  await expect(page).toHaveURL(/checkout\.stripe\.com/);
});
