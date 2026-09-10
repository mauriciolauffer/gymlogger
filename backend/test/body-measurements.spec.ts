import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";
import { registerUser } from "./helpers";

describe("Body measurements", () => {
  let token: string;

  beforeEach(async () => {
    ({ token } = await registerUser(
      "measurements@example.com",
      "password123",
      "Measurements User",
    ));
  });

  it("creates a body measurement entry", async () => {
    const res = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          date: "2026-01-15",
          weight: 80,
          weight_unit: "kg",
          body_fat_pct: 15,
          chest: 100,
          waist: 80,
          hips: 95,
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = await res.json<{ measurement: { weight: number; date: string } }>();
    expect(data.measurement.weight).toBe(80);
    expect(data.measurement.date).toBe("2026-01-15");
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

  it("gets a single measurement by id", async () => {
    const createRes = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: "2026-02-01", weight: 79 }),
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

  it("updates a measurement", async () => {
    const createRes = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: "2026-03-01", weight: 78 }),
      },
      env,
    );
    const { measurement } = await createRes.json<{ measurement: { id: string } }>();

    const res = await app.request(
      `/api/v1/body-measurements/${measurement.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weight: 77, body_fat_pct: 14 }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ measurement: { weight: number } }>();
    expect(data.measurement.weight).toBe(77);
  });

  it("deletes a measurement", async () => {
    const createRes = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: "2026-04-01", weight: 76 }),
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

  it("returns 404 for unknown measurement id", async () => {
    const res = await app.request(
      "/api/v1/body-measurements/nonexistent",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid JSON body on create", async () => {
    const res = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: "bad",
      },
      env,
    );
    expect(res.status).toBe(400);
  });
});
