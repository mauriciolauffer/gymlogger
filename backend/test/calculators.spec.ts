import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";
import { registerUser } from "./helpers";

describe("Calculators", () => {
  let token: string;

  beforeEach(async () => {
    ({ token } = await registerUser("calc@example.com", "password123", "Calc User"));
  });

  it("returns warmup sets for a valid target weight", async () => {
    const res = await app.request(
      "/api/v1/calculators/warmup?targetWeight=100",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{
      targetWeight: number;
      warmUpSets: { percent: number; weight: number; reps: number }[];
    }>();
    expect(data.targetWeight).toBe(100);
    expect(data.warmUpSets.length).toBe(3);
    expect(data.warmUpSets[0].percent).toBe(40);
  });

  it("returns 400 when targetWeight is missing", async () => {
    const res = await app.request(
      "/api/v1/calculators/warmup",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json<{ error: string }>();
    expect(data.error).toBe("targetWeight must be a positive number");
  });

  it("returns 400 for a negative targetWeight", async () => {
    const res = await app.request(
      "/api/v1/calculators/warmup?targetWeight=-50",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for targetWeight of zero", async () => {
    const res = await app.request(
      "/api/v1/calculators/warmup?targetWeight=0",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(400);
  });
});
