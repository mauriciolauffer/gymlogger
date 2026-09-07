import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("Analytics extended coverage", () => {
  let token: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Analytics Tester",
          email: "analytics-ext@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;
  });

  it("GET /analytics/performance returns 400 when exerciseId missing", async () => {
    const res = await app.request(
      "/api/v1/analytics/performance",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("exerciseId parameter is required");
  });

  it("GET /analytics/performance returns 404 for unknown exercise", async () => {
    const res = await app.request(
      "/api/v1/analytics/performance?exerciseId=nonexistent",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Exercise not found");
  });

  it("GET /analytics/year-in-review works with explicit year", async () => {
    const res = await app.request(
      "/api/v1/analytics/year-in-review?year=2026",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.year).toBe(2026);
  });

  it("GET /analytics/streak returns streak > 1 for consecutive workout days", async () => {
    // Create two workouts on consecutive days to exercise the streak branch
    await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Day 1", start_time: "2026-01-01T10:00:00Z" }),
      },
      env,
    );
    await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Day 2", start_time: "2026-01-02T10:00:00Z" }),
      },
      env,
    );
    // Third workout with a gap (breaks streak)
    await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Day 4", start_time: "2026-01-04T10:00:00Z" }),
      },
      env,
    );

    const res = await app.request(
      "/api/v1/analytics/consistency",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.currentStreakDays).toBe("number");
  });
});

describe("Body measurements extended coverage", () => {
  let token: string;
  let measurementId: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Measurements Tester",
          email: "measurements-ext@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;

    const createRes = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          date: "2026-01-15",
          weight: 80,
          weight_unit: "kg",
          chest: 100,
          length_unit: "cm",
        }),
      },
      env,
    );
    const createData = await createRes.json();
    measurementId = createData.measurement.id;
  });

  it("GET /:id returns 404 for unknown id", async () => {
    const res = await app.request(
      "/api/v1/body-measurements/nonexistent",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("PUT /:id returns 404 for unknown id", async () => {
    const res = await app.request(
      "/api/v1/body-measurements/nonexistent",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weight: 85 }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("PUT /:id returns 400 for invalid JSON body", async () => {
    const res = await app.request(
      `/api/v1/body-measurements/${measurementId}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: "not json",
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("DELETE /:id returns 404 for unknown id", async () => {
    const res = await app.request(
      "/api/v1/body-measurements/nonexistent",
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("GET / with from/to filters converts units", async () => {
    // Update settings to lbs/in to trigger unit conversion branches
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
      "/api/v1/body-measurements?from=2026-01-01&to=2026-12-31",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.measurements.length).toBeGreaterThan(0);
    expect(data.measurements[0].weight_unit).toBe("lbs");
  });
});

describe("Workouts previous-values no history", () => {
  let token: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Prev Tester",
          email: "prev-values@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;
  });

  it("GET /previous-values returns empty sets when no history", async () => {
    const res = await app.request(
      "/api/v1/workouts/previous-values?exerciseId=ex_bench_press",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sets).toEqual([]);
    expect(data.previousWorkoutDate).toBeNull();
  });

  it("POST /start with no body uses defaults", async () => {
    const res = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.workout.title).toBe("Workout");
  });
});

describe("Users settings fallback insert", () => {
  let token: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Settings Fallback Tester",
          email: "settings-fallback@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;
  });

  it("GET /users/settings returns defaults even if not explicitly set", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.settings).toBeDefined();
    expect(data.settings.preferred_weight_unit).toBe("kg");
  });
});

describe("PR detector zero weight path", () => {
  let token: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "PR Tester",
          email: "pr-zero@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;
  });

  it("logging a set with zero weight does not trigger PR detection", async () => {
    const startRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Zero Weight Test" }),
      },
      env,
    );
    const { workout } = await startRes.json();

    const addExRes = await app.request(
      `/api/v1/workouts/${workout.id}/exercises`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise_id: "ex_bench_press", order_index: 0 }),
      },
      env,
    );
    const { workoutExercise } = await addExRes.json();

    const setRes = await app.request(
      `/api/v1/workouts/${workout.id}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          workout_exercise_id: workoutExercise.id,
          weight: 0,
          reps: 0,
        }),
      },
      env,
    );
    expect(setRes.status).toBe(201);
    const setData = await setRes.json();
    expect(setData.isPr).toBe(false);
  });
});
