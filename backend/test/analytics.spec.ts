import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";
import { registerUser } from "./helpers";

describe("Analytics", () => {
  let token: string;

  beforeEach(async () => {
    ({ token } = await registerUser("analytics@example.com", "password123", "Analytics User"));
  });

  it("returns consistency stats", async () => {
    const res = await app.request(
      "/api/v1/analytics/consistency",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ currentStreakDays: number; totalWorkouts: number }>();
    expect(typeof data.currentStreakDays).toBe("number");
    expect(typeof data.totalWorkouts).toBe("number");
  });

  it("consistency breaks streak on non-consecutive days", async () => {
    for (const startTime of ["2026-01-01T10:00:00Z", "2026-01-03T10:00:00Z"]) {
      await app.request(
        "/api/v1/workouts/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: "Workout", start_time: startTime }),
        },
        env,
      );
    }
    const res = await app.request(
      "/api/v1/analytics/consistency",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ currentStreakDays: number; totalWorkouts: number }>();
    expect(data.totalWorkouts).toBe(2);
    expect(data.currentStreakDays).toBe(1);
  });

  it("monthly-report for December (month=12 edge case)", async () => {
    const res = await app.request(
      "/api/v1/analytics/monthly-report?year=2026&month=12",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ period: { year: number; month: number } }>();
    expect(data.period.year).toBe(2026);
    expect(data.period.month).toBe(12);
  });

  it("monthly-report with no year/month uses defaults", async () => {
    const res = await app.request(
      "/api/v1/analytics/monthly-report",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ period: { year: number; month: number } }>();
    expect(typeof data.period.year).toBe("number");
    expect(typeof data.period.month).toBe("number");
  });

  it("year-in-review with no year param uses current year", async () => {
    const res = await app.request(
      "/api/v1/analytics/year-in-review",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ year: number }>();
    expect(typeof data.year).toBe("number");
  });

  it("muscle-distribution returns zero percentage when no sets logged", async () => {
    const res = await app.request(
      "/api/v1/analytics/muscle-distribution",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ totalSets: number; distribution: { percentage: number }[] }>();
    expect(data.totalSets).toBe(0);
    if (data.distribution.length > 0) {
      expect(data.distribution.every((d) => d.percentage === 0)).toBe(true);
    }
  });

  it("muscle-distribution with from/to filters", async () => {
    const res = await app.request(
      "/api/v1/analytics/muscle-distribution?from=2026-01-01&to=2026-12-31",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ totalSets: number; distribution: unknown[] }>();
    expect(typeof data.totalSets).toBe("number");
  });

  it("sets-per-muscle-group with from/to filters", async () => {
    const res = await app.request(
      "/api/v1/analytics/sets-per-muscle-group?from=2026-01-01&to=2026-12-31",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ setsPerMuscleGroup: unknown[] }>();
    expect(Array.isArray(data.setsPerMuscleGroup)).toBe(true);
  });

  it("performance returns 400 when exerciseId is missing", async () => {
    const res = await app.request(
      "/api/v1/analytics/performance",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("performance returns 404 for unknown exerciseId", async () => {
    const res = await app.request(
      "/api/v1/analytics/performance?exerciseId=nonexistent_exercise",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("consistency streak increments on consecutive days", async () => {
    for (const startTime of [
      "2026-03-01T10:00:00Z",
      "2026-03-02T10:00:00Z",
      "2026-03-03T10:00:00Z",
    ]) {
      await app.request(
        "/api/v1/workouts/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: "Daily Workout", start_time: startTime }),
        },
        env,
      );
    }
    const res = await app.request(
      "/api/v1/analytics/consistency",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ currentStreakDays: number; totalWorkouts: number }>();
    expect(data.totalWorkouts).toBe(3);
    expect(data.currentStreakDays).toBe(3);
  });

  it("performance returns empty curves when no sets logged", async () => {
    const res = await app.request(
      "/api/v1/analytics/performance?exerciseId=ex_bench_press",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("performance with zero-weight/zero-rep set excludes from curves", async () => {
    const wRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Zero Set", start_time: "2026-05-01T10:00:00Z" }),
      },
      env,
    );
    const { workout } = await wRes.json<{ workout: { id: string } }>();
    const addEx = await app.request(
      `/api/v1/workouts/${workout.id}/exercises`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise_id: "ex_bench_press" }),
      },
      env,
    );
    const { workoutExercise } = await addEx.json<{ workoutExercise: { id: string } }>();
    await app.request(
      `/api/v1/workouts/${workout.id}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workout_exercise_id: workoutExercise.id, weight: 0, reps: 0 }),
      },
      env,
    );

    const res = await app.request(
      "/api/v1/analytics/performance?exerciseId=ex_bench_press",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{
      oneRepMaxCurve: unknown[];
      maxWeightCurve: unknown[];
      maxRepsCurve: unknown[];
    }>();
    expect(data.oneRepMaxCurve.length).toBe(0);
    expect(data.maxWeightCurve.length).toBe(0);
    expect(data.maxRepsCurve.length).toBe(0);
  });

  it("performance with multiple sets per session hits sessionsMap cache branch", async () => {
    const wRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Multi Set Session", start_time: "2026-06-01T10:00:00Z" }),
      },
      env,
    );
    const { workout } = await wRes.json<{ workout: { id: string } }>();

    const addEx = await app.request(
      `/api/v1/workouts/${workout.id}/exercises`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise_id: "ex_bench_press" }),
      },
      env,
    );
    const { workoutExercise } = await addEx.json<{ workoutExercise: { id: string } }>();

    for (const [weight, reps] of [
      [80, 10],
      [90, 8],
      [100, 5],
    ] as [number, number][]) {
      await app.request(
        `/api/v1/workouts/${workout.id}/sets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ workout_exercise_id: workoutExercise.id, weight, reps }),
        },
        env,
      );
    }

    const res = await app.request(
      "/api/v1/analytics/performance?exerciseId=ex_bench_press",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{
      history: { sets: unknown[] }[];
      maxWeightCurve: { value: number }[];
    }>();
    expect(data.history.length).toBe(1);
    expect(data.history[0].sets.length).toBe(3);
    expect(data.maxWeightCurve[0].value).toBe(100);
  });

  it("performance with zero-weight set and real-weight set (maxReps branches)", async () => {
    const wRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Mixed Reps", start_time: "2026-07-01T10:00:00Z" }),
      },
      env,
    );
    const { workout } = await wRes.json<{ workout: { id: string } }>();

    const addEx = await app.request(
      `/api/v1/workouts/${workout.id}/exercises`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise_id: "ex_squat" }),
      },
      env,
    );
    const { workoutExercise } = await addEx.json<{ workoutExercise: { id: string } }>();

    await app.request(
      `/api/v1/workouts/${workout.id}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workout_exercise_id: workoutExercise.id, weight: 0, reps: 0 }),
      },
      env,
    );
    await app.request(
      `/api/v1/workouts/${workout.id}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workout_exercise_id: workoutExercise.id, weight: 140, reps: 3 }),
      },
      env,
    );

    const res = await app.request(
      "/api/v1/analytics/performance?exerciseId=ex_squat",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{
      maxWeightCurve: { value: number }[];
      maxRepsCurve: { value: number }[];
    }>();
    expect(data.maxWeightCurve[0].value).toBe(140);
    expect(data.maxRepsCurve[0].value).toBe(3);
  });
});
