import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("REQ-09: Body Measurements Progress", () => {
  let token: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Progress User",
          email: "progress@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;

    await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          preferred_weight_unit: "lbs",
          preferred_length_unit: "in",
        }),
      },
      env,
    );

    await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: "2026-01-01",
          weight: 100,
          weight_unit: "kg",
          waist: 101.6,
          length_unit: "cm",
        }),
      },
      env,
    );
  });

  it("fetches chronological measurement history converted to preferred units", async () => {
    const res = await app.request(
      "/api/v1/body-measurements",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.measurements.length).toBe(1);
    const entry = data.measurements[0];
    expect(entry.weight_unit).toBe("lbs");
    expect(entry.weight).toBeCloseTo(220.5, 0);
    expect(entry.length_unit).toBe("in");
    expect(entry.waist).toBeCloseTo(40.0, 0);
  });
});
