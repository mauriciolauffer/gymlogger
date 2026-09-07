import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("REQ-11: Log In", () => {
  beforeEach(async () => {
    await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Sam Smith",
          email: "sam@example.com",
          password: "password123",
        }),
      },
      env,
    );
  });

  it("logs in successfully with valid credentials", async () => {
    const res = await app.request(
      "/api/v1/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "sam@example.com",
          password: "password123",
        }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe("Login successful");
    expect(data.token).toBeDefined();
    expect(data.user.email).toBe("sam@example.com");
  });

  it("rejects login with wrong password", async () => {
    const res = await app.request(
      "/api/v1/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "sam@example.com",
          password: "wrongpassword",
        }),
      },
      env,
    );

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Invalid email or password");
  });

  it("rejects login for non-existent user", async () => {
    const res = await app.request(
      "/api/v1/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nobody@example.com",
          password: "password123",
        }),
      },
      env,
    );

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Invalid email or password");
  });

  it("allows authenticated logout", async () => {
    const loginRes = await app.request(
      "/api/v1/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "sam@example.com", password: "password123" }),
      },
      env,
    );
    const { token } = await loginRes.json();

    const logoutRes = await app.request(
      "/api/v1/auth/logout",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );

    expect(logoutRes.status).toBe(200);
    const logoutData = await logoutRes.json();
    expect(logoutData.message).toBe("Logout successful");
  });

  it("denies logout without valid token", async () => {
    const res = await app.request(
      "/api/v1/auth/logout",
      {
        method: "POST",
        headers: { Authorization: "Bearer invalidtoken" },
      },
      env,
    );

    expect(res.status).toBe(401);
  });
});
