import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { RegisterPage } from "../pages/register.page";

// These tests run WITHOUT auth state (login/register pages are public)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {
  test("login page renders", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(page.locator("ui5-card-header[title-text='GymLogger']")).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
  });

  test("shows error when fields are empty @smoke", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginButton.click();
    await loginPage.expectError("Please enter both email and password.");
  });

  test("shows error for wrong credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("notfound@example.com", "WrongPass123!");
    await loginPage.expectError(/invalid|credentials|not found/i);
  });

  test("register link navigates to /register", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.registerButton.click();
    await page.waitForURL("**/register");
  });

  test("register a new account and redirect to workouts @smoke", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    const email = `e2e-reg-${Date.now()}@gymlogger.test`;
    await registerPage.register({
      name: "Test Athlete",
      email,
      password: "NewPass1234!",
    });

    await page.waitForURL("**/workouts");
    await expect(page.getByRole("heading", { name: "Workout History" })).toBeVisible();
  });

  test("register shows error when passwords do not match", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.register({
      email: "mismatch@gymlogger.test",
      password: "GoodPass1!",
      confirmPassword: "DifferentPass2!",
    });
    await registerPage.expectError("Passwords do not match");
  });

  test("register shows error for short password", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.register({
      email: "short@gymlogger.test",
      password: "short",
      confirmPassword: "short",
    });
    await registerPage.expectError(/8 characters/i);
  });

  test("authenticated user visiting /login is redirected to /workouts", async ({ browser }) => {
    // Load the auth session for this specific test
    const context = await browser.newContext({
      storageState: "playwright/.auth/session.json",
    });
    const page = await context.newPage();
    await page.goto("/login");
    await page.waitForURL("**/workouts");
    await context.close();
  });

  test("unauthenticated user visiting /workouts is redirected to /login", async ({ page }) => {
    await page.goto("/workouts");
    await page.waitForURL("**/login");
  });
});
