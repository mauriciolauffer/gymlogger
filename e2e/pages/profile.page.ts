import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export class ProfilePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly saveButton: Locator;
  readonly successStrip: Locator;
  readonly errorStrip: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "User Profile" });
    // Name input: ui5-input without an id — target by placeholder
    this.nameInput = page.locator("ui5-input[placeholder='Athlete Name']").getByRole("textbox");
    this.saveButton = page.locator("ui5-button").filter({ hasText: "Save Profile" });
    this.successStrip = page.locator("ui5-message-strip[design='Positive']");
    this.errorStrip = page.locator("ui5-message-strip[design='Negative']");
  }

  async goto() {
    await this.page.goto("/profile");
    await expect(this.heading).toBeVisible();
  }

  async waitForLoaded() {
    // Profile fetches on mount; button appears once loading is done
    await expect(this.saveButton).toBeVisible();
  }

  async updateName(name: string) {
    await this.nameInput.fill(name);
    await this.saveButton.click();
  }

  async expectSuccess() {
    await expect(this.successStrip).toBeVisible();
  }
}
