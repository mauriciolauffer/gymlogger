import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly registerButton: Locator;
  readonly errorStrip: Locator;

  constructor(page: Page) {
    this.page = page;
    // ui5-input exposes its inner <input> through shadow DOM; Playwright
    // can reach it via the host element's id scope.
    this.emailInput = page.locator("#email-input").getByRole("textbox");
    this.passwordInput = page.locator("#password-input").getByRole("textbox");
    this.loginButton = page.locator("ui5-button").filter({ hasText: "Log In" });
    this.registerButton = page.locator("ui5-button").filter({ hasText: "Register" });
    this.errorStrip = page.locator("ui5-message-strip");
  }

  async goto() {
    await this.page.goto("/login");
    await expect(this.loginButton).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async loginAndWaitForWorkouts(email: string, password: string) {
    await this.login(email, password);
    await this.page.waitForURL("**/workouts");
  }

  async expectError(text: string | RegExp) {
    await expect(this.errorStrip).toContainText(text);
  }
}
