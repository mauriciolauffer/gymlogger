import { describe, expect, it, beforeEach } from "vitest";
import app from "../src/index";
import { createMockD1 } from "../src/db/d1-mock";

describe("REQ-13: System Settings & Preferences", () => {
  let db: D1Database;
  let token: string;

  beforeEach(async () => {
    db = createMockD1();
    const regRes = await app.request(
      new Request("http://localhost/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Jordan Settings",
          email: "jordan@example.com",
          password: "password123",
        }),
      }),
      {},
      { DB: db },
    );
    const data = await regRes.json();
    token = data.token;
  });

  it("fetches default user settings", async () => {
    const res = await app.request(
      new Request("http://localhost/api/v1/users/settings", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
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
      new Request("http://localhost/api/v1/users/settings", {
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
      }),
      {},
      { DB: db },
    );

    expect(updateRes.status).toBe(200);
    const data = await updateRes.json();
    expect(data.settings.theme).toBe("dark");
    expect(data.settings.preferred_weight_unit).toBe("lbs");
    expect(data.settings.preferred_length_unit).toBe("in");
    expect(data.settings.rest_timer_duration_seconds).toBe(120);

    // Verify persistence with GET
    const getRes = await app.request(
      new Request("http://localhost/api/v1/users/settings", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
    );
    const getData = await getRes.json();
    expect(getData.settings.preferred_weight_unit).toBe("lbs");
  });

  it("validates invalid settings input", async () => {
    const resInvalidTheme = await app.request(
      new Request("http://localhost/api/v1/users/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ theme: "blue" }),
      }),
      {},
      { DB: db },
    );
    expect(resInvalidTheme.status).toBe(400);

    const resInvalidUnit = await app.request(
      new Request("http://localhost/api/v1/users/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferred_weight_unit: "tons" }),
      }),
      {},
      { DB: db },
    );
    expect(resInvalidUnit.status).toBe(400);
  });
});
