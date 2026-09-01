import { describe, expect, it, beforeEach } from "vitest";
import app from "../src/index";
import { createMockD1 } from "../src/db/d1-mock";

describe("REQ-07: Capture Body Measurements", () => {
  let db: D1Database;
  let token: string;

  beforeEach(async () => {
    db = createMockD1();
    const regRes = await app.request(
      new Request("http://localhost/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Metrics User",
          email: "metrics@example.com",
          password: "password123",
        }),
      }),
      {},
      { DB: db },
    );
    const data = await regRes.json();
    token = data.token;
  });

  it("records, fetches, updates, and deletes body measurements with decoupled units", async () => {
    // Record body measurement
    const postRes = await app.request(
      new Request("http://localhost/api/v1/body-measurements", {
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
      }),
      {},
      { DB: db },
    );

    expect(postRes.status).toBe(201);
    const postData = await postRes.json();
    const bmId = postData.measurement.id;
    expect(bmId).toContain("bm_");
    expect(postData.measurement.weight).toBe(78.5);
    expect(postData.measurement.chest).toBe(102);

    // Fetch single entry
    const getRes = await app.request(
      new Request(`http://localhost/api/v1/body-measurements/${bmId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
    );
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.measurement.waist).toBe(81);

    // Update entry
    const putRes = await app.request(
      new Request(`http://localhost/api/v1/body-measurements/${bmId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ weight: 78.0, waist: 80 }),
      }),
      {},
      { DB: db },
    );
    expect(putRes.status).toBe(200);
    const putData = await putRes.json();
    expect(putData.measurement.weight).toBe(78.0);
    expect(putData.measurement.waist).toBe(80);

    // Delete entry
    const delRes = await app.request(
      new Request(`http://localhost/api/v1/body-measurements/${bmId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
    );
    expect(delRes.status).toBe(200);
  });
});
