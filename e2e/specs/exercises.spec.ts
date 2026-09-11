import { test, expect } from "@playwright/test";
import { ExercisesPage } from "../pages/exercises.page";

test.describe("Exercise Library", () => {
  test("page loads with heading @smoke", async ({ page }) => {
    const exercisesPage = new ExercisesPage(page);
    await exercisesPage.goto();
    await exercisesPage.waitForLoaded();
    await expect(exercisesPage.heading).toBeVisible();
  });

  test("shows seeded exercises from the database @smoke", async ({ page }) => {
    const exercisesPage = new ExercisesPage(page);
    await exercisesPage.goto();
    await exercisesPage.waitForLoaded();
    // The DB is seeded with standard exercises; there should be at least one.
    await expect(exercisesPage.exerciseList).toBeVisible();
    const items = exercisesPage.page.locator("ui5-list-item-standard");
    await expect(items.first()).toBeVisible();
  });

  test("search filters exercise list", async ({ page }) => {
    const exercisesPage = new ExercisesPage(page);
    await exercisesPage.goto();
    await exercisesPage.waitForLoaded();

    await exercisesPage.search("bench");
    const items = exercisesPage.page.locator("ui5-list-item-standard");
    const count = await items.count();
    // All visible items should include "bench" in their text (case-insensitive)
    for (let i = 0; i < count; i++) {
      // oxlint-disable-next-line no-await-in-loop
      const text = await items.nth(i).innerText();
      expect(text.toLowerCase()).toContain("bench");
    }
  });

  test("empty search result shows empty state", async ({ page }) => {
    const exercisesPage = new ExercisesPage(page);
    await exercisesPage.goto();
    await exercisesPage.waitForLoaded();

    await exercisesPage.search("xyznonexistentexercise123");
    await expect(exercisesPage.emptyState).toBeVisible();
  });

  test("Create Custom Exercise button is visible", async ({ page }) => {
    const exercisesPage = new ExercisesPage(page);
    await exercisesPage.goto();
    await expect(exercisesPage.createButton).toBeVisible();
  });

  test("clicking an exercise opens the detail modal", async ({ page }) => {
    const exercisesPage = new ExercisesPage(page);
    await exercisesPage.goto();
    await exercisesPage.waitForLoaded();

    const firstItem = page.locator("ui5-list-item-standard").first();
    await firstItem.click();
    // ExerciseDetailModal renders as a ui5-dialog; wait for it to open
    await expect(page.locator("ui5-dialog[open]")).toBeVisible();
  });
});
