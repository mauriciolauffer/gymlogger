import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";
import { registerUser } from "./helpers";

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
          sex: "male",
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

  it("rejects invalid height unit", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ height_unit: "feet" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("rejects non-positive height", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ height: -5 }),
      },
      env,
    );
    expect(res.status).toBe(400);
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

  it("updates user settings", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          preferred_weight_unit: "lbs",
          theme: "dark",
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
    expect(data.settings?.theme).toBe("dark");
    expect(data.settings?.rest_timer_duration_seconds).toBe(120);
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
});
