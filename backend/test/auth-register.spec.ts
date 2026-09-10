import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:test";
import app from "../src/index";
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
