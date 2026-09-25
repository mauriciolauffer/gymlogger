import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import app from "../src/index.ts";
import { registerUser } from "./helpers.ts";
import { usersProfile, userSettings } from "../src/db/schema.ts";

describe("User profile", () => {
  let token: string;

  beforeEach(async () => {
    ({ token } = await registerUser("profile@example.com", "password123", "Profile User"));
  });

  it("gets the user profile", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ profile: { email: string; name: string } }>();
    expect(data.profile.email).toBe("profile@example.com");
    expect(data.profile.name).toBe("Profile User");
  });

  it("updates the user profile", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: "Updated Name",
          location: "Berlin",
          sex: "M",
          height: 180,
          height_unit: "cm",
          bio: "Lifter",
        }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ message: string; profile: { name: string; location: string } }>();
    expect(data.message).toBe("Profile updated successfully");
    expect(data.profile.location).toBe("Berlin");
    expect(data.profile.name).toBe("Updated Name");
  });

  it("updates profile with birthday and partial fields", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ birthday: "1990-05-15", location: "Berlin" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ profile: { birthday: string; location: string } }>();
    expect(data.profile.birthday).toBe("1990-05-15");
    expect(data.profile.location).toBe("Berlin");
  });

  it("updates profile with only bio (other fields fall back to current values)", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bio: "Just a bio update" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ profile: { bio: string } }>();
    expect(data.profile.bio).toBe("Just a bio update");
  });

  it("rejects invalid sex value", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sex: "unknown_value" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("ignores unknown fields on profile update", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ height_unit: "feet" }),
      },
      env,
    );
    // height_unit is no longer a profile field — unknown fields are stripped, not rejected
    expect(res.status).toBe(200);
  });

  it("accepts height on body measurements (not profile)", async () => {
    const res = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ height: 175, length_unit: "cm" }),
      },
      env,
    );
    expect(res.status).toBe(201);
  });

  it("returns 404 when profile row is missing", async () => {
    const { token: freshToken, userId } = await registerUser(
      "no-profile@example.com",
      "password123",
      "No Profile",
    );
    const db = drizzle(env.DB);
    await db.delete(usersProfile).where(eq(usersProfile.id, userId)).run();

    const res = await app.request(
      "/api/v1/users/profile",
      { headers: { Authorization: `Bearer ${freshToken}` } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when updating profile with missing row", async () => {
    const { token: freshToken, userId } = await registerUser(
      "no-profile-put@example.com",
      "password123",
      "No Profile Put",
    );
    const db = drizzle(env.DB);
    await db.delete(usersProfile).where(eq(usersProfile.id, userId)).run();

    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${freshToken}` },
        body: JSON.stringify({ bio: "test" }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });
});

describe("User settings", () => {
  let token: string;

  beforeEach(async () => {
    ({ token } = await registerUser("settings@example.com", "password123", "Settings User"));
  });

  it("gets user settings", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ settings: { preferred_weight_unit: string } }>();
    expect(data.settings?.preferred_weight_unit).toBe("kg");
  });

  it("gets settings auto-creating defaults when none exist", async () => {
    const { token: freshToken } = await registerUser(
      "users-ext@example.com",
      "password123",
      "Users Ext",
    );
    const res = await app.request(
      "/api/v1/users/settings",
      { headers: { Authorization: `Bearer ${freshToken}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{
      settings: {
        preferred_weight_unit: string;
        theme: string;
        preferred_length_unit: string;
        language: string;
        rest_timer_duration_seconds: number;
        notifications_enabled: boolean;
      };
    }>();
    expect(data.settings?.preferred_weight_unit).toBe("kg");
    expect(data.settings?.theme).toBe("S");
    expect(data.settings?.language).toBe("en");
    expect(data.settings?.rest_timer_duration_seconds).toBe(90);
    expect(data.settings?.notifications_enabled).toBe(true);
  });

  it("updates user settings", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          preferred_weight_unit: "lbs",
          theme: "D",
          rest_timer_duration_seconds: 120,
        }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{
      settings: {
        preferred_weight_unit: string;
        theme: string;
        rest_timer_duration_seconds: number;
      };
    }>();
    expect(data.settings?.preferred_weight_unit).toBe("lbs");
    expect(data.settings?.theme).toBe("D");
    expect(data.settings?.rest_timer_duration_seconds).toBe(120);
  });

  it("updates settings with notifications_enabled flag", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notifications_enabled: false, preferred_length_unit: "in" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{
      settings: { notifications_enabled: boolean; preferred_length_unit: string };
    }>();
    expect(data.settings?.notifications_enabled).toBe(false);
    expect(data.settings?.preferred_length_unit).toBe("in");
  });

  it("updates settings with language", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language: "de" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ settings: { language: string } }>();
    expect(data.settings?.language).toBe("de");
  });

  it("updates settings twice (upsert idempotency)", async () => {
    await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme: "D" }),
      },
      env,
    );

    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme: "L" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ settings: { theme: string } }>();
    expect(data.settings?.theme).toBe("L");
  });

  it("updates settings when no current settings exist (upsert path)", async () => {
    const { token: freshToken } = await registerUser(
      "settings-upsert@example.com",
      "password123",
      "Upsert User",
    );

    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${freshToken}` },
        body: JSON.stringify({
          theme: "D",
          preferred_weight_unit: "lbs",
          preferred_length_unit: "in",
          language: "es",
          rest_timer_duration_seconds: 60,
          notifications_enabled: false,
        }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{
      settings: {
        theme: string;
        preferred_weight_unit: string;
        language: string;
      };
    }>();
    expect(data.settings?.theme).toBe("D");
    expect(data.settings?.preferred_weight_unit).toBe("lbs");
    expect(data.settings?.language).toBe("es");
  });

  it("rejects invalid theme", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme: "neon" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("rejects invalid weight unit", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferred_weight_unit: "stone" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("rejects non-positive rest timer duration", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rest_timer_duration_seconds: 0 }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("auto-creates settings row when none exists on GET /settings", async () => {
    const { token: freshToken, userId } = await registerUser(
      "settings-missing@example.com",
      "password123",
      "Missing Settings",
    );
    const db = drizzle(env.DB);
    await db.delete(userSettings).where(eq(userSettings.userId, userId)).run();

    const res = await app.request(
      "/api/v1/users/settings",
      { headers: { Authorization: `Bearer ${freshToken}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{
      settings: { theme: string; preferred_weight_unit: string };
    }>();
    expect(data.settings.theme).toBe("S");
    expect(data.settings.preferred_weight_unit).toBe("kg");
  });
});
