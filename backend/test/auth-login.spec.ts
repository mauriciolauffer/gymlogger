import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";
import { registerUser } from "./helpers";

describe("Login", () => {
  beforeEach(async () => {
    await registerUser("sam@example.com", "password123", "Sam Smith");
  });

  it("logs in with valid credentials and receives a bearer token", async () => {
    const res = await app.request(
      "/api/auth/sign-in/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "sam@example.com", password: "password123" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const token = res.headers.get("set-auth-token");
    expect(token).toBeDefined();
    const data = await res.json<{ user: { email: string } }>();
    expect(data.user.email).toBe("sam@example.com");
  });

  it("rejects wrong password", async () => {
    const res = await app.request(
      "/api/auth/sign-in/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "sam@example.com", password: "wrongpassword" }),
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("rejects non-existent user", async () => {
    const res = await app.request(
      "/api/auth/sign-in/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nobody@example.com", password: "password123" }),
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("signs out with a valid bearer token", async () => {
    const { token } = await registerUser("signout@example.com", "password123", "Signout User");

    const res = await app.request(
      "/api/auth/sign-out",
      { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("sign-out with invalid token is idempotent (returns 200)", async () => {
    const res = await app.request(
      "/api/auth/sign-out",
      { method: "POST", headers: { Authorization: "Bearer invalidtoken" } },
      env,
    );
    expect(res.status).toBe(200);
  });
});
