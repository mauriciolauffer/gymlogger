import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

async function registerAndLogin(email: string) {
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

async function startWorkout(token: string, title = "Test", startTime?: string) {
  const body: Record<string, string> = { title };
  if (startTime) body.start_time = startTime;
  const res = await app.request(
    "/api/v1/workouts/start",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    },
    env,
  );
  return (await res.json()).workout;
}

async function logSet(
  token: string,
  workoutId: string,
  weId: string,
  weight: number,
  reps: number,
) {
  return app.request(
    `/api/v1/workouts/${workoutId}/sets`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workout_exercise_id: weId, weight, reps }),
    },
    env,
  );
}

describe("Analytics branch coverage", () => {
  let token: string;

  beforeEach(async () => {
    token = await registerAndLogin("analytics-branch@example.com");
  });

  it("GET /monthly-report with December month triggers year rollover branch", async () => {
    const res = await app.request(
      "/api/v1/analytics/monthly-report?year=2025&month=12",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.period.month).toBe(12);
  });

  it("GET /monthly-report with normal month", async () => {
    const res = await app.request(
      "/api/v1/analytics/monthly-report?year=2026&month=3",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("GET /monthly-report without params uses current date", async () => {
    const res = await app.request(
      "/api/v1/analytics/monthly-report",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("GET /muscle-distribution with sets covers totalSets > 0 branch", async () => {
    const workout = await startWorkout(token, "Muscle Dist");
    const addExRes = await app.request(
      `/api/v1/workouts/${workout.id}/exercises`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise_id: "ex_bench_press", order_index: 0 }),
      },
      env,
    );
    const weId = (await addExRes.json()).workoutExercise.id;
    await logSet(token, workout.id, weId, 80, 8);

    const res = await app.request(
      "/api/v1/analytics/muscle-distribution",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalSets).toBeGreaterThan(0);
    expect(data.distribution[0].percentage).toBeGreaterThan(0);
  });

  it("GET /muscle-distribution with from/to filters", async () => {
    const res = await app.request(
      "/api/v1/analytics/muscle-distribution?from=2026-01-01&to=2026-12-31",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("GET /sets-per-muscle-group with from/to filters", async () => {
    const res = await app.request(
      "/api/v1/analytics/sets-per-muscle-group?from=2026-01-01&to=2026-12-31",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("GET /performance returns data for existing exercise", async () => {
    const res = await app.request(
      "/api/v1/analytics/performance?exerciseId=ex_bench_press",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });
});

describe("Body measurements POST invalid JSON", () => {
  let token: string;

  beforeEach(async () => {
    token = await registerAndLogin("bm-invalid@example.com");
  });

  it("POST / returns 400 for invalid JSON", async () => {
    const res = await app.request(
      "/api/v1/body-measurements",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: "not json",
      },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON body");
  });
});

describe("Workouts branch gaps", () => {
  let token: string;

  beforeEach(async () => {
    token = await registerAndLogin("workouts-branch@example.com");
  });

  it("PUT /:id/sets/:setId with partial update (only rpe)", async () => {
    const workout = await startWorkout(token);
    const addExRes = await app.request(
      `/api/v1/workouts/${workout.id}/exercises`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise_id: "ex_bench_press", order_index: 0 }),
      },
      env,
    );
    const weId = (await addExRes.json()).workoutExercise.id;
    const setRes = await logSet(token, workout.id, weId, 100, 5);
    const setId = (await setRes.json()).set.id;

    const updateRes = await app.request(
      `/api/v1/workouts/${workout.id}/sets/${setId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rpe: 9 }),
      },
      env,
    );
    expect(updateRes.status).toBe(200);
  });

  it("PUT /:id/finish without notes body", async () => {
    const workout = await startWorkout(token);
    const res = await app.request(
      `/api/v1/workouts/${workout.id}/finish`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("GET /workouts with limit and offset params", async () => {
    const res = await app.request(
      "/api/v1/workouts?limit=5&offset=0",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });
});

describe("Workout templates branch gaps", () => {
  let token: string;

  beforeEach(async () => {
    token = await registerAndLogin("tpl-branch@example.com");
  });

  it("POST / with exercises array uses order_index from items", async () => {
    const res = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: "Branch Template",
          exercises: [
            { exercise_id: "ex_bench_press" },
            { exercise_id: "ex_overhead_press" },
          ],
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.template.exercises.length).toBe(2);
  });

  it("PUT /:id with exercises array uses order_index from items", async () => {
    const createRes = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Tpl for Update" }),
      },
      env,
    );
    const templateId = (await createRes.json()).template.id;

    const res = await app.request(
      `/api/v1/workout-templates/${templateId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          exercises: [
            { exercise_id: "ex_bench_press" },
          ],
        }),
      },
      env,
    );
    expect(res.status).toBe(200);
  });
});

describe("Users settings upsert branch", () => {
  let token: string;

  beforeEach(async () => {
    token = await registerAndLogin("settings-upsert@example.com");
  });

  it("PUT /settings with all valid values", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          theme: "dark",
          preferred_weight_unit: "lbs",
          preferred_length_unit: "in",
          language: "pt",
          rest_timer_duration_seconds: 120,
          notifications_enabled: false,
        }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.settings.theme).toBe("dark");
    expect(data.settings.preferred_weight_unit).toBe("lbs");
  });

  it("PUT /settings with null values falls back to current", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          preferred_weight_unit: null,
          preferred_length_unit: null,
          rest_timer_duration_seconds: null,
          notifications_enabled: null,
        }),
      },
      env,
    );
    expect(res.status).toBe(200);
  });
});
