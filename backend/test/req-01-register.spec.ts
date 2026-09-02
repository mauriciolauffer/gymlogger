import { describe, expect, it, beforeEach } from "vitest";
import app from "../src/index";
import { createMockD1 } from "../src/db/d1-mock";

describe("REQ-01: Account Creation", () => {
  let db: D1Database;

  beforeEach(() => {
    db = createMockD1();
  });

  it("registers a new user successfully and initializes user_settings", async () => {
    const res = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Alex Athlete",
          email: "alex@example.com",
          password: "securepassword123",
        }),
      },
      { DB: db },
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.message).toBe("Account created successfully");
    expect(data.token).toBeDefined();
    expect(data.user.email).toBe("alex@example.com");
    expect(data.user.name).toBe("Alex Athlete");
    expect(data.user.id).toBeDefined();

    const userInDb = await db
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(data.user.id)
      .first();
    expect(userInDb).toBeDefined();
    expect(userInDb?.email).toBe("alex@example.com");

    const settingsInDb = await db
      .prepare("SELECT * FROM user_settings WHERE user_id = ?")
      .bind(data.user.id)
      .first();
    expect(settingsInDb).toBeDefined();
    expect(settingsInDb?.preferred_weight_unit).toBe("kg");
  });

  it("rejects registration with duplicate email", async () => {
    const payload = {
      name: "User One",
      email: "duplicate@example.com",
      password: "password123",
    };

    await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      { DB: db },
    );

    const res = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      { DB: db },
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Email is already registered");
  });

  it("validates invalid email and weak password", async () => {
    const resInvalidEmail = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "notanemail", password: "password123" }),
      },
      { DB: db },
    );
    expect(resInvalidEmail.status).toBe(400);

    const resWeakPassword = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "valid@example.com", password: "123" }),
      },
      { DB: db },
    );
    expect(resWeakPassword.status).toBe(400);
  });
});
