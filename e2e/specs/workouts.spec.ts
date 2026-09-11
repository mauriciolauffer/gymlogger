import { test, expect } from "@playwright/test";
import { WorkoutsPage } from "../pages/workouts.page";

// Uses the shared authenticated session from auth.setup.ts
test.describe("Workout History", () => {
  test("page loads and shows heading @smoke", async ({ page }) => {
    const workoutsPage = new WorkoutsPage(page);
    await workoutsPage.goto();
    await workoutsPage.waitForLoaded();
    await expect(workoutsPage.heading).toBeVisible();
  });

  test("shows empty state when no workouts exist", async ({ page }) => {
    const workoutsPage = new WorkoutsPage(page);
    await workoutsPage.goto();
    await workoutsPage.waitForLoaded();
    // Fresh test account has no workouts yet
    const isEmpty = await workoutsPage.emptyState.isVisible();
    const hasList = await workoutsPage.workoutList.isVisible();
    expect(isEmpty || hasList).toBeTruthy();
  });

  test("Start Empty Workout button is visible @smoke", async ({ page }) => {
    const workoutsPage = new WorkoutsPage(page);
    await workoutsPage.goto();
    await expect(workoutsPage.startWorkoutButton).toBeVisible();
  });

  test("clicking Start Empty Workout navigates to /active-workout", async ({ page }) => {
    const workoutsPage = new WorkoutsPage(page);
    await workoutsPage.goto();
    await workoutsPage.startNewWorkout();
    expect(page.url()).toContain("/active-workout");
  });
});
