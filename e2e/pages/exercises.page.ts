import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export class ExercisesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly createButton: Locator;
  readonly exerciseList: Locator;
  readonly emptyState: Locator;
  readonly loadingState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Exercise Library" });
    this.searchInput = page
      .locator("ui5-input[placeholder='Search exercises...']")
      .getByRole("textbox");
    this.createButton = page.locator("ui5-button").filter({ hasText: "Create Custom Exercise" });
    this.exerciseList = page.locator(".list-card ui5-list");
    this.emptyState = page.locator(".empty-state");
    this.loadingState = page.locator(".loading-state");
  }

  async goto() {
    await this.page.goto("/exercises");
    await expect(this.heading).toBeVisible();
  }

  async waitForLoaded() {
    await expect(this.loadingState).not.toBeVisible();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    // The view triggers fetchExercises on input event — wait for loading to
    // disappear after typing.
    await expect(this.loadingState).not.toBeVisible();
  }

  exerciseItemByName(name: string) {
    return this.page.locator("ui5-list-item-standard").filter({ hasText: name });
  }
}
