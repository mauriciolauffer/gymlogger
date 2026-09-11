import { test, expect } from "@playwright/test";
import { ProfilePage } from "../pages/profile.page";

test.describe("User Profile", () => {
  test("profile page loads with heading @smoke", async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.waitForLoaded();
    await expect(profilePage.heading).toBeVisible();
  });

  test("email field is visible and read-only", async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.waitForLoaded();

    const emailInput = page.locator("ui5-input[readonly]");
    await expect(emailInput).toBeVisible();
  });

  test("Save Profile button is visible @smoke", async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.waitForLoaded();
    await expect(profilePage.saveButton).toBeVisible();
  });

  test("updating name saves successfully", async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.waitForLoaded();

    const newName = `Athlete-${Date.now()}`;
    await profilePage.updateName(newName);
    await profilePage.expectSuccess();
  });
});
