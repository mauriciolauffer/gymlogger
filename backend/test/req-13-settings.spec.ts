import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("REQ-13: System Settings & Preferences", () => {
  let token: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Jordan Settings",
          email: "jordan@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;
  });

  it("fetches default user settings", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.settings.theme).toBe("system");
    expect(data.settings.preferred_weight_unit).toBe("kg");
    expect(data.settings.preferred_length_unit).toBe("cm");
    expect(data.settings.rest_timer_duration_seconds).toBe(90);
  });

  it("updates settings and persists across requests", async () => {
    const updateRes = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          theme: "dark",
          preferred_weight_unit: "lbs",
          preferred_length_unit: "in",
          rest_timer_duration_seconds: 120,
          notifications_enabled: false,
        }),
      },
      env,
    );

    expect(updateRes.status).toBe(200);
    const data = await updateRes.json();
    expect(data.settings.theme).toBe("dark");
    expect(data.settings.preferred_weight_unit).toBe("lbs");
    expect(data.settings.preferred_length_unit).toBe("in");
    expect(data.settings.rest_timer_duration_seconds).toBe(120);

    const getRes = await app.request(
      "/api/v1/users/settings",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    const getData = await getRes.json();
    expect(getData.settings.preferred_weight_unit).toBe("lbs");
  });

  it("validates invalid settings input", async () => {
    const resInvalidTheme = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ theme: "blue" }),
      },
      env,
    );
    expect(resInvalidTheme.status).toBe(400);

    const resInvalidUnit = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferred_weight_unit: "tons" }),
      },
      env,
    );
    expect(resInvalidUnit.status).toBe(400);
  });
});
