import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("REQ-07: Capture Body Measurements", () => {
  let token: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Metrics User",
          email: "metrics@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;
  });

  it("records, fetches, updates, and deletes body measurements with decoupled units", async () => {
    const postRes = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: "2026-02-15",
          weight: 78.5,
          weight_unit: "kg",
          body_fat_pct: 14.2,
          chest: 102,
          waist: 81,
          biceps: 38,
          length_unit: "cm",
        }),
      },
      env,
    );

    expect(postRes.status).toBe(201);
    const postData = await postRes.json();
    const bmId = postData.measurement.id;
    expect(bmId).toContain("bm_");
    expect(postData.measurement.weight).toBe(78.5);
    expect(postData.measurement.chest).toBe(102);

    const getRes = await app.request(
      `/api/v1/body-measurements/${bmId}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.measurement.waist).toBe(81);

    const putRes = await app.request(
      `/api/v1/body-measurements/${bmId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ weight: 78.0, waist: 80 }),
      },
      env,
    );
    expect(putRes.status).toBe(200);
    const putData = await putRes.json();
    expect(putData.measurement.weight).toBe(78.0);
    expect(putData.measurement.waist).toBe(80);

    const delRes = await app.request(
      `/api/v1/body-measurements/${bmId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );
    expect(delRes.status).toBe(200);
  });
});
