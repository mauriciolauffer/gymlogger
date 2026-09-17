import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import app from "../src/index";
import { registerUser } from "./helpers";
import { user, usersProfile, userSettings } from "../src/db/schema";

describe("Account creation", () => {
  it("accepts signup requests from the local frontend origin", async () => {
    const res = await app.request(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({
          name: "Frontend Athlete",
          email: "frontend-origin@example.com",
          password: "securepassword123",
        }),
      },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("rejects signup requests from an untrusted origin", async () => {
    const res = await app.request(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://untrusted.example",
        },
        body: JSON.stringify({
          name: "Untrusted Athlete",
          email: "untrusted-origin@example.com",
          password: "securepassword123",
        }),
      },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("registers a new user and initializes profile and settings", async () => {
    const res = await app.request(
      "/api/auth/sign-up/email",
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
    expect(res.status).toBe(200);
    const token = res.headers.get("set-auth-token");
    expect(token).toBeDefined();

    const data = await res.json<{ user: { id: string; email: string; name: string } }>();
    expect(data.user.email).toBe("alex@example.com");
    expect(data.user.name).toBe("Alex Athlete");
    expect(data.user.id).toBeDefined();

    const db = drizzle(env.DB);
    const userInDb = await db.select().from(user).where(eq(user.id, data.user.id)).get();
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
    expect(settingsInDb?.preferredWeightUnit).toBe("kg");
  });

  it("rejects duplicate email", async () => {
    const payload = { name: "User One", email: "duplicate@example.com", password: "password123" };
    await app.request(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      env,
    );

    const res = await app.request(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      env,
    );
    expect(res.status).toBe(422);
  });

  it("rejects password shorter than 8 characters", async () => {
    const res = await app.request(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "valid@example.com", password: "123", name: "Test" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });
});

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
    // Better Auth always returns 200 for sign-out regardless of token validity
    const res = await app.request(
      "/api/auth/sign-out",
      { method: "POST", headers: { Authorization: "Bearer invalidtoken" } },
      env,
    );
    expect(res.status).toBe(200);
  });
});

describe("Private routes deny unauthenticated access", () => {
  it.each([
    ["GET", "/api/v1/muscle-groups"],
    ["GET", "/api/v1/exercises"],
    ["POST", "/api/v1/exercises"],
    ["GET", "/api/v1/exercises/any-id"],
    ["PUT", "/api/v1/exercises/any-id"],
    ["DELETE", "/api/v1/exercises/any-id"],
    ["GET", "/api/v1/users/profile"],
    ["PUT", "/api/v1/users/profile"],
    ["GET", "/api/v1/users/settings"],
    ["PUT", "/api/v1/users/settings"],
    ["POST", "/api/v1/workouts/start"],
    ["GET", "/api/v1/workouts"],
    ["GET", "/api/v1/workouts/previous-values?exerciseId=x"],
    ["GET", "/api/v1/workouts/any-id/live"],
    ["GET", "/api/v1/workout-templates"],
    ["POST", "/api/v1/workout-templates"],
    ["GET", "/api/v1/personal-records"],
    ["GET", "/api/v1/calculators/warmup?targetWeight=100"],
    ["GET", "/api/v1/analytics/muscle-groups"],
    ["GET", "/api/v1/analytics/volume"],
    ["GET", "/api/v1/body-measurements"],
    ["POST", "/api/v1/body-measurements"],
  ] as [string, string][])(
    "%s %s → 401 without token",
    async (method, path) => {
      const res = await app.request(path, { method }, env);
      expect(res.status).toBe(401);
    },
  );
});
