import { describe, expect, it, beforeEach } from "vitest";
import { createClient, registerUser } from "./helpers.ts";

describe("Body measurements", () => {
  let token: string;
  let client: ReturnType<typeof createClient>;

  beforeEach(async () => {
    ({ token } = await registerUser("bm@example.com", "password123", "BM User"));
    client = createClient();
  });

  it("creates a new body measurement", async () => {
    const res = await client.api.v1["body-measurements"].$post(
      { json: { date: "2026-01-15", weight: 80, weight_unit: "kg" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(201);
    const data = await res.json<{ measurement: { weight: number } }>();
    expect(data.measurement.weight).toBe(80);
  });

  it("lists body measurements", async () => {
    await client.api.v1["body-measurements"].$post(
      { json: { date: "2026-01-15", weight: 80 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const res = await client.api.v1["body-measurements"].$get(
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ measurements: unknown[] }>();
    expect(data.measurements.length).toBeGreaterThan(0);
  });

  it("gets a specific body measurement by id", async () => {
    const createRes = await client.api.v1["body-measurements"].$post(
      { json: { weight: 82 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { measurement } = await createRes.json<{ measurement: { id: string } }>();

    const res = await client.api.v1["body-measurements"][":id"].$get(
      { param: { id: measurement.id } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(200);
  });

  it("updates a body measurement", async () => {
    const createRes = await client.api.v1["body-measurements"].$post(
      { json: { weight: 80 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { measurement } = await createRes.json<{ measurement: { id: string } }>();

    const res = await client.api.v1["body-measurements"][":id"].$put(
      { param: { id: measurement.id }, json: { weight: 79 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ measurement: { weight: number } }>();
    expect(data.measurement.weight).toBe(79);
  });

  it("deletes a body measurement", async () => {
    const createRes = await client.api.v1["body-measurements"].$post(
      { json: { weight: 80 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { measurement } = await createRes.json<{ measurement: { id: string } }>();

    const res = await client.api.v1["body-measurements"][":id"].$delete(
      { param: { id: measurement.id } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(200);
  });

  it("lists measurements with from/to date filter", async () => {
    await client.api.v1["body-measurements"].$post(
      { json: { date: "2026-03-15", weight: 80 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const res = await client.api.v1["body-measurements"].$get(
      { query: { from: "2026-01-01", to: "2026-12-31" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ measurements: unknown[] }>();
    expect(data.measurements.length).toBeGreaterThan(0);
  });

  it("lists measurements excluding out-of-range dates", async () => {
    await client.api.v1["body-measurements"].$post(
      { json: { date: "2026-06-01", weight: 82 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const res = await client.api.v1["body-measurements"].$get(
      { query: { from: "2030-01-01", to: "2030-12-31" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ measurements: unknown[] }>();
    expect(data.measurements.length).toBe(0);
  });

  it("creates measurement with all fields including length measurements", async () => {
    const res = await client.api.v1["body-measurements"].$post(
      {
        json: {
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
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(201);
    const data = await res.json<{
      measurement: { chest: number; biceps: number };
    }>();
    expect(data.measurement.chest).toBe(100);
    expect(data.measurement.biceps).toBe(38);
  });

  it("returns 404 when getting non-existent measurement", async () => {
    const res = await client.api.v1["body-measurements"][":id"].$get(
      { param: { id: "bm_nonexistent" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when updating non-existent measurement", async () => {
    const res = await client.api.v1["body-measurements"][":id"].$put(
      { param: { id: "bm_nonexistent" }, json: { weight: 75 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when deleting non-existent measurement", async () => {
    const res = await client.api.v1["body-measurements"][":id"].$delete(
      { param: { id: "bm_nonexistent" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(404);
  });

  it("converts measurements from lbs to kg based on user settings", async () => {
    await client.api.v1.users.settings.$put(
      { json: { preferred_weight_unit: "lbs" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    await client.api.v1["body-measurements"].$post(
      { json: { date: "2026-05-01", weight: 176, weight_unit: "lbs" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const listRes = await client.api.v1["body-measurements"].$get(
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(listRes.status).toBe(200);
    const data = await listRes.json<{ measurements: { weight: number; weight_unit: string }[] }>();
    expect(data.measurements[0].weight_unit).toBe("lbs");
  });

  it("updates multiple measurement fields", async () => {
    const createRes = await client.api.v1["body-measurements"].$post(
      { json: { date: "2026-07-01", weight: 85, waist: 90 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { measurement } = await createRes.json<{ measurement: { id: string } }>();

    const res = await client.api.v1["body-measurements"][":id"].$put(
      {
        param: { id: measurement.id },
        json: {
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
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ measurement: { weight: number; waist: number } }>();
    expect(data.measurement.weight).toBeCloseTo(84.5);
    expect(data.measurement.waist).toBe(89);
  });

  it("creates measurement using settings preferred units when no unit given", async () => {
    await client.api.v1.users.settings.$put(
      { json: { preferred_weight_unit: "lbs", preferred_length_unit: "in" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const res = await client.api.v1["body-measurements"].$post(
      { json: { weight: 180, chest: 40 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(201);
    const data = await res.json<{
      measurement: { weightUnit: string; lengthUnit: string };
    }>();
    expect(data.measurement.weightUnit).toBe("lbs");
    expect(data.measurement.lengthUnit).toBe("in");
  });

  it("update measurement with no patch fields succeeds", async () => {
    const createRes = await client.api.v1["body-measurements"].$post(
      { json: { weight: 80 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { measurement } = await createRes.json<{ measurement: { id: string; weight: number } }>();

    const res = await client.api.v1["body-measurements"][":id"].$put(
      { param: { id: measurement.id }, json: {} },
      { headers: { Authorization: `Bearer ${token}` } },
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

    await client.api.v1["body-measurements"].$post(
      { json: { weight: 75, weight_unit: "kg" } },
      { headers: { Authorization: `Bearer ${freshToken}` } },
    );

    const res = await client.api.v1["body-measurements"].$get(
      {},
      { headers: { Authorization: `Bearer ${freshToken}` } },
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

    const res = await client.api.v1["body-measurements"].$post(
      { json: { weight: 80 } },
      { headers: { Authorization: `Bearer ${freshToken}` } },
    );
    expect(res.status).toBe(201);
    const data = await res.json<{ measurement: { weightUnit: string; lengthUnit: string } }>();
    expect(data.measurement.weightUnit).toBe("kg");
    expect(data.measurement.lengthUnit).toBe("cm");
  });

  it("returns 400 when body_fat_pct exceeds 100", async () => {
    const res = await client.api.v1["body-measurements"].$post(
      { json: { date: "2026-01-01", body_fat_pct: 101 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(400);
  });
});
