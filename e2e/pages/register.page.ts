import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export class RegisterPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly registerButton: Locator;
  readonly loginButton: Locator;
  readonly errorStrip: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.locator("#name-input").getByRole("textbox");
    this.emailInput = page.locator("#email-input").getByRole("textbox");
    this.passwordInput = page.locator("#password-input").getByRole("textbox");
    this.confirmPasswordInput = page.locator("#confirm-password-input").getByRole("textbox");
    this.registerButton = page.locator("ui5-button").filter({ hasText: "Register" });
    this.loginButton = page.locator("ui5-button").filter({ hasText: "Log In" });
    this.errorStrip = page.locator("ui5-message-strip");
  }

  async goto() {
    await this.page.goto("/register");
    await expect(this.registerButton).toBeVisible();
  }

  async register(opts: {
    name?: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }) {
    if (opts.name) await this.nameInput.fill(opts.name);
    await this.emailInput.fill(opts.email);
    await this.passwordInput.fill(opts.password);
    await this.confirmPasswordInput.fill(opts.confirmPassword ?? opts.password);
    await this.registerButton.click();
  }

  async expectError(text: string) {
    await expect(this.errorStrip).toContainText(text);
  }
}
