import { describe, expect, it, beforeEach } from "vitest";
import app from "../src/index";
import { createMockD1 } from "../src/db/d1-mock";

describe("REQ-09: Body Measurements Progress", () => {
  let db: D1Database;
  let token: string;

  beforeEach(async () => {
    db = createMockD1();
    const regRes = await app.request(
      new Request("http://localhost/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Progress User",
          email: "progress@example.com",
          password: "password123",
        }),
      }),
      {},
      { DB: db },
    );
    const data = await regRes.json();
    token = data.token;

    // Update settings to lbs and inches
    await app.request(
      new Request("http://localhost/api/v1/users/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          preferred_weight_unit: "lbs",
          preferred_length_unit: "in",
        }),
      }),
      {},
      { DB: db },
    );

    // Record measurement entry in kg and cm
    await app.request(
      new Request("http://localhost/api/v1/body-measurements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: "2026-01-01",
          weight: 100, // kg
          weight_unit: "kg",
          waist: 101.6, // cm (40 inches)
          length_unit: "cm",
        }),
      }),
      {},
      { DB: db },
    );
  });

  it("fetches chronological measurement history converted to preferred units", async () => {
    const res = await app.request(
      new Request("http://localhost/api/v1/body-measurements", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.measurements.length).toBe(1);
    const entry = data.measurements[0];
    expect(entry.weight_unit).toBe("lbs");
    expect(entry.weight).toBeCloseTo(220.5, 0); // 100 kg ~ 220.5 lbs
    expect(entry.length_unit).toBe("in");
    expect(entry.waist).toBeCloseTo(40.0, 0); // 101.6 cm ~ 40 in
  });
});
