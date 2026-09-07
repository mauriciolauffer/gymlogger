import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

async function register(email: string) {
  const res = await app.request(
    "/api/v1/auth/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Tester", email, password: "password123" }),
    },
    env,
  );
  return (await res.json()).token as string;
}

describe("Body measurements PUT all fields", () => {
  let token: string;
  let measurementId: string;

  beforeEach(async () => {
    token = await register("bm-put-all@example.com");
    const createRes = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: "2026-01-10", weight: 75 }),
      },
      env,
    );
    measurementId = (await createRes.json()).measurement.id;
  });

  it("PUT with all fields covers all patch branches", async () => {
    const res = await app.request(
      `/api/v1/body-measurements/${measurementId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          date: "2026-02-01",
          weight: 80,
          weight_unit: "kg",
          body_fat_pct: 15.5,
          chest: 100,
          waist: 80,
          hips: 90,
          shoulders: 110,
          biceps: 35,
          forearms: 30,
          thighs: 55,
          calves: 38,
          neck: 38,
          length_unit: "cm",
        }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.measurement.weight).toBe(80);
    expect(data.measurement.chest).toBe(100);
  });

  it("PUT with no fields (empty patch) still returns 200", async () => {
    const res = await app.request(
      `/api/v1/body-measurements/${measurementId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("POST without date uses today by default", async () => {
    const res = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weight: 79 }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.measurement.date).toBeDefined();
  });
});

describe("Analytics from/to branch coverage", () => {
  let token: string;

  beforeEach(async () => {
    token = await register("analytics-from-to@example.com");
  });

  it("GET /sets-per-muscle-group without filters (no from/to)", async () => {
    const res = await app.request(
      "/api/v1/analytics/sets-per-muscle-group",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("GET /muscle-distribution without filters (no from/to)", async () => {
    const res = await app.request(
      "/api/v1/analytics/muscle-distribution",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("GET /consistency without workouts returns 0 streak", async () => {
    const res = await app.request(
      "/api/v1/analytics/consistency",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.currentStreakDays).toBe(0);
    expect(data.totalWorkouts).toBe(0);
  });

  it("GET /year-in-review without params uses current year", async () => {
    const res = await app.request(
      "/api/v1/analytics/year-in-review",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });
});

describe("Workouts GET /:id with no exercises (empty exerciseIds)", () => {
  let token: string;

  beforeEach(async () => {
    token = await register("workouts-no-ex@example.com");
  });

  it("GET /:id for workout with no exercises returns empty exercises array", async () => {
    const startRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Empty Workout" }),
      },
      env,
    );
    const workoutId = (await startRes.json()).workout.id;

    const res = await app.request(
      `/api/v1/workouts/${workoutId}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.workout.exercises).toEqual([]);
  });
});

describe("Users profile 404 on new user without profile row", () => {
  let token: string;

  beforeEach(async () => {
    token = await register("profile-branches@example.com");
  });

  it("PUT /profile with all valid fields", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: "Full Name",
          location: "Lisbon",
          birthday: "1990-01-01",
          sex: "male",
          height: 180,
          height_unit: "cm",
          bio: "Fitness enthusiast",
        }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile.location).toBe("Lisbon");
  });

  it("PUT /profile with in unit", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ height: 70, height_unit: "in" }),
      },
      env,
    );
    expect(res.status).toBe(200);
  });
});
