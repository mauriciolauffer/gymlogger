import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:test";
import app from "../src/index";
import { user, usersProfile, userSettings } from "../src/db/schema";

describe("REQ-01: Account Creation", () => {
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
      env,
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.message).toBe("Account created successfully");
    expect(data.token).toBeDefined();
    expect(data.user.email).toBe("alex@example.com");
    expect(data.user.name).toBe("Alex Athlete");
    expect(data.user.id).toBeDefined();

    const db = drizzle(env.DB);
    const userInDb = await db.select().from(user).where(eq(user.id, data.user.id)).get();
    expect(userInDb).toBeDefined();
    expect(userInDb?.email).toBe("alex@example.com");

    const profileInDb = await db
      .select()
      .from(usersProfile)
      .where(eq(usersProfile.id, data.user.id))
      .get();
    expect(profileInDb).toBeDefined();

    const settingsInDb = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, data.user.id))
      .get();
    expect(settingsInDb).toBeDefined();
    expect(settingsInDb?.preferredWeightUnit).toBe("kg");
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
      env,
    );

    const res = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      env,
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
      env,
    );
    expect(resInvalidEmail.status).toBe(400);

    const resWeakPassword = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "valid@example.com", password: "123" }),
      },
      env,
    );
    expect(resWeakPassword.status).toBe(400);
  });
});
