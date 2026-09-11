import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export class WorkoutsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly startWorkoutButton: Locator;
  readonly workoutList: Locator;
  readonly emptyState: Locator;
  readonly loadingState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Workout History" });
    this.startWorkoutButton = page.locator("ui5-button").filter({ hasText: "Start Empty Workout" });
    this.workoutList = page.locator(".history-card ui5-list");
    this.emptyState = page.locator(".empty-state");
    this.loadingState = page.locator(".loading-state");
  }

  async goto() {
    await this.page.goto("/workouts");
    await expect(this.heading).toBeVisible();
  }

  async waitForLoaded() {
    await expect(this.loadingState).not.toBeVisible();
  }

  async startNewWorkout() {
    await this.startWorkoutButton.click();
    await this.page.waitForURL("**/active-workout");
  }

  workoutItemByTitle(title: string) {
    return this.page.locator("ui5-list-item-standard").filter({ hasText: title });
  }
}
