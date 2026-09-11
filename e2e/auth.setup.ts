import { request, test as setup, expect } from "@playwright/test";

const AUTH_FILE = "playwright/.auth/session.json";

setup("create test user and save auth state", async ({ browser }) => {
  const apiContext = await request.newContext({
    baseURL: "http://localhost:5173",
  });

  const email = `e2e-${Date.now()}@gymlogger.test`;
  const password = "E2eTestPass1!";

  const res = await apiContext.post("/api/auth/sign-up/email", {
    headers: { Origin: "http://localhost:5173" },
    data: { name: "E2E Tester", email, password },
  });

  if (!res.ok()) {
    throw new Error(`Registration failed: ${res.status()} ${await res.text()}`);
  }

  const token = res.headers()["set-auth-token"];
  if (!token) {
    throw new Error("Registration response missing set-auth-token header");
  }

  const body = await res.json();
  const user = body.user;

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("http://localhost:5173/login");

  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem("gymlogger_token", token);
      localStorage.setItem("gymlogger_user", JSON.stringify(user));
    },
    { token, user },
  );

  await context.storageState({ path: AUTH_FILE });
  await context.close();
  await apiContext.dispose();
});
