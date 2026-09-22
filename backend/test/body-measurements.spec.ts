import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import app from "../src/index.ts";
import { registerUser } from "./helpers.ts";

describe("Body measurements", () => {
  let token: string;

  beforeEach(async () => {
    ({ token } = await registerUser("bm@example.com", "password123", "BM User"));
  });

  it("creates a new body measurement", async () => {
    const res = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: "2026-01-15", weight: 80, weight_unit: "kg" }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = await res.json<{ measurement: { weight: number } }>();
    expect(data.measurement.weight).toBe(80);
  });

  it("lists body measurements", async () => {
    await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: "2026-01-15", weight: 80 }),
      },
      env,
    );
    const res = await app.request(
      "/api/v1/body-measurements",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ measurements: unknown[] }>();
    expect(data.measurements.length).toBeGreaterThan(0);
  });

  it("gets a specific body measurement by id", async () => {
    const createRes = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weight: 82 }),
      },
      env,
    );
    const { measurement } = await createRes.json<{ measurement: { id: string } }>();

    const res = await app.request(
      `/api/v1/body-measurements/${measurement.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("updates a body measurement", async () => {
    const createRes = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weight: 80 }),
      },
      env,
    );
    const { measurement } = await createRes.json<{ measurement: { id: string } }>();

    const res = await app.request(
      `/api/v1/body-measurements/${measurement.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weight: 79 }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ measurement: { weight: number } }>();
    expect(data.measurement.weight).toBe(79);
  });

  it("deletes a body measurement", async () => {
    const createRes = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weight: 80 }),
      },
      env,
    );
    const { measurement } = await createRes.json<{ measurement: { id: string } }>();

    const res = await app.request(
      `/api/v1/body-measurements/${measurement.id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("lists measurements with from/to date filter", async () => {
    await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: "2026-03-15", weight: 80 }),
      },
      env,
    );

    const res = await app.request(
      "/api/v1/body-measurements?from=2026-01-01&to=2026-12-31",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ measurements: unknown[] }>();
    expect(data.measurements.length).toBeGreaterThan(0);
  });

  it("lists measurements excluding out-of-range dates", async () => {
    await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: "2026-06-01", weight: 82 }),
      },
      env,
    );

    const res = await app.request(
      "/api/v1/body-measurements?from=2030-01-01&to=2030-12-31",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ measurements: unknown[] }>();
    expect(data.measurements.length).toBe(0);
  });

  it("creates measurement with all fields including length measurements", async () => {
    const res = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          weight: 80,
          weight_unit: "kg",
          body_fat_pct: 15,
          chest: 100,
          waist: 80,
          hips: 95,
          shoulders: 120,
          biceps: 38,
          forearms: 30,
          thighs: 55,
          calves: 38,
          neck: 38,
          length_unit: "cm",
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = await res.json<{
      measurement: { chest: number; biceps: number };
    }>();
    expect(data.measurement.chest).toBe(100);
    expect(data.measurement.biceps).toBe(38);
  });

  it("returns 404 when getting non-existent measurement", async () => {
    const res = await app.request(
      "/api/v1/body-measurements/bm_nonexistent",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when updating non-existent measurement", async () => {
    const res = await app.request(
      "/api/v1/body-measurements/bm_nonexistent",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weight: 75 }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when deleting non-existent measurement", async () => {
    const res = await app.request(
      "/api/v1/body-measurements/bm_nonexistent",
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("converts measurements from lbs to kg based on user settings", async () => {
    await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferred_weight_unit: "lbs" }),
      },
      env,
    );

    await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: "2026-05-01", weight: 176, weight_unit: "lbs" }),
      },
      env,
    );

    const listRes = await app.request(
      "/api/v1/body-measurements",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(listRes.status).toBe(200);
    const data = await listRes.json<{ measurements: { weight: number; weight_unit: string }[] }>();
    expect(data.measurements[0].weight_unit).toBe("lbs");
  });

  it("updates multiple measurement fields", async () => {
    const createRes = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: "2026-07-01", weight: 85, waist: 90 }),
      },
      env,
    );
    const { measurement } = await createRes.json<{ measurement: { id: string } }>();

    const res = await app.request(
      `/api/v1/body-measurements/${measurement.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          date: "2026-07-02",
          weight: 84.5,
          weight_unit: "kg",
          body_fat_pct: 16,
          waist: 89,
          hips: 96,
          chest: 101,
          shoulders: 118,
          biceps: 37,
          forearms: 29,
          thighs: 56,
          calves: 37,
          neck: 39,
          length_unit: "cm",
        }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ measurement: { weight: number; waist: number } }>();
    expect(data.measurement.weight).toBeCloseTo(84.5);
    expect(data.measurement.waist).toBe(89);
  });

  it("creates measurement using settings preferred units when no unit given", async () => {
    await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferred_weight_unit: "lbs", preferred_length_unit: "in" }),
      },
      env,
    );

    const res = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weight: 180, chest: 40 }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = await res.json<{
      measurement: { weightUnit: string; lengthUnit: string };
    }>();
    expect(data.measurement.weightUnit).toBe("lbs");
    expect(data.measurement.lengthUnit).toBe("in");
  });

  it("update measurement with no patch fields succeeds", async () => {
    const createRes = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weight: 80 }),
      },
      env,
    );
    const { measurement } = await createRes.json<{ measurement: { id: string; weight: number } }>();

    const res = await app.request(
      `/api/v1/body-measurements/${measurement.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ measurement: { weight: number } }>();
    expect(data.measurement.weight).toBe(80);
  });

  it("GET list with no settings row uses defaults for unit conversion", async () => {
    const { token: freshToken } = await registerUser(
      "no-settings-bm@example.com",
      "password123",
      "No Settings BM",
    );

    await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${freshToken}` },
        body: JSON.stringify({ weight: 75, weight_unit: "kg" }),
      },
      env,
    );

    const res = await app.request(
      "/api/v1/body-measurements",
      { headers: { Authorization: `Bearer ${freshToken}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ measurements: { weight_unit: string }[] }>();
    expect(data.measurements[0].weight_unit).toBe("kg");
  });

  it("creates measurement without settings row uses defaults", async () => {
    const { token: freshToken } = await registerUser(
      "no-settings-bm2@example.com",
      "password123",
      "No Settings BM2",
    );

    const res = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${freshToken}` },
        body: JSON.stringify({ weight: 80 }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = await res.json<{ measurement: { weightUnit: string; lengthUnit: string } }>();
    expect(data.measurement.weightUnit).toBe("kg");
    expect(data.measurement.lengthUnit).toBe("cm");
  });

  it("returns 400 when body_fat_pct exceeds 100", async () => {
    const res = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: "2026-01-01", body_fat_pct: 101 }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });
});
