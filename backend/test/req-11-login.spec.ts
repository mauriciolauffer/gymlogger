import { describe, expect, it, beforeEach } from "vitest";
import app from "../src/index";
import { createMockD1 } from "../src/db/d1-mock";

describe("REQ-11: Log In", () => {
  let db: D1Database;

  beforeEach(async () => {
    db = createMockD1();
    // Register user for login tests
    await app.request(
      new Request("http://localhost/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Sam Smith",
          email: "sam@example.com",
          password: "password123",
        }),
      }),
      {},
      { DB: db },
    );
  });

  it("logs in successfully with valid credentials", async () => {
    const res = await app.request(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "sam@example.com",
          password: "password123",
        }),
      }),
      {},
      { DB: db },
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe("Login successful");
    expect(data.token).toBeDefined();
    expect(data.user.email).toBe("sam@example.com");
  });

  it("rejects login with wrong password", async () => {
    const res = await app.request(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "sam@example.com",
          password: "wrongpassword",
        }),
      }),
      {},
      { DB: db },
    );

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Invalid email or password");
  });

  it("rejects login for non-existent user", async () => {
    const res = await app.request(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nobody@example.com",
          password: "password123",
        }),
      }),
      {},
      { DB: db },
    );

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Invalid email or password");
  });

  it("allows authenticated logout", async () => {
    // Login to get token
    const loginRes = await app.request(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "sam@example.com", password: "password123" }),
      }),
      {},
      { DB: db },
    );
    const { token } = await loginRes.json();

    // Call logout with token
    const logoutRes = await app.request(
      new Request("http://localhost/api/v1/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
    );

    expect(logoutRes.status).toBe(200);
    const logoutData = await logoutRes.json();
    expect(logoutData.message).toBe("Logout successful");
  });

  it("denies logout without valid token", async () => {
    const res = await app.request(
      new Request("http://localhost/api/v1/auth/logout", {
        method: "POST",
        headers: { Authorization: "Bearer invalidtoken" },
      }),
      {},
      { DB: db },
    );

    expect(res.status).toBe(401);
  });
});
