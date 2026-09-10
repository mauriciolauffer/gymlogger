import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";
import { registerUser } from "./helpers";

describe("Analytics — empty state", () => {
  let token: string;

  beforeEach(async () => {
    ({ token } = await registerUser(
      "analytics-empty@example.com",
      "password123",
      "Analytics User",
    ));
  });

  it("monthly-report returns totals for a given month", async () => {
    const res = await app.request(
      "/api/v1/analytics/monthly-report?year=2026&month=1",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{
      period: { year: number; month: number };
      totalWorkouts: number;
    }>();
    expect(data.period.year).toBe(2026);
    expect(data.period.month).toBe(1);
    expect(typeof data.totalWorkouts).toBe("number");
  });

  it("muscle-distribution returns distribution array", async () => {
    const res = await app.request(
      "/api/v1/analytics/muscle-distribution",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ totalSets: number; distribution: unknown[] }>();
    expect(typeof data.totalSets).toBe("number");
    expect(Array.isArray(data.distribution)).toBe(true);
  });

  it("sets-per-muscle-group returns setsPerMuscleGroup array", async () => {
    const res = await app.request(
      "/api/v1/analytics/sets-per-muscle-group",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ setsPerMuscleGroup: unknown[] }>();
    expect(Array.isArray(data.setsPerMuscleGroup)).toBe(true);
  });

  it("consistency returns streak and activeDates", async () => {
    const res = await app.request(
      "/api/v1/analytics/consistency",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{
      currentStreakDays: number;
      totalWorkouts: number;
      activeDates: string[];
    }>();
    expect(typeof data.currentStreakDays).toBe("number");
    expect(typeof data.totalWorkouts).toBe("number");
    expect(Array.isArray(data.activeDates)).toBe(true);
  });

  it("consistency counts consecutive-day streak", async () => {
    for (let day = 1; day <= 3; day++) {
      await app.request(
        "/api/v1/workouts/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: `Day ${day}`, start_time: `2026-03-0${day}T10:00:00Z` }),
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
    const data = await res.json<{ totalWorkouts: number }>();
    expect(data.totalWorkouts).toBe(3);
  });

  it("year-in-review returns totals for a given year", async () => {
    const res = await app.request(
      "/api/v1/analytics/year-in-review?year=2026",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ year: number; totalWorkouts: number }>();
    expect(data.year).toBe(2026);
    expect(typeof data.totalWorkouts).toBe("number");
  });

  it("performance returns 400 when exerciseId is missing", async () => {
    const res = await app.request(
      "/api/v1/analytics/performance",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("performance returns 404 for unknown exercise", async () => {
    const res = await app.request(
      "/api/v1/analytics/performance?exerciseId=nonexistent",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });
});

describe("Analytics — with workout data", () => {
  let token: string;

  beforeEach(async () => {
    ({ token } = await registerUser(
      "analytics-data@example.com",
      "password123",
      "Analytics Athlete",
    ));

    const wRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Feb Session", start_time: "2026-02-10T10:00:00Z" }),
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
        body: JSON.stringify({ workout_exercise_id: workoutExercise.id, weight: 100, reps: 5 }),
      },
      env,
    );

    await app.request(
      `/api/v1/workouts/${workout.id}/finish`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      },
      env,
    );
  });

  it("monthly-report shows correct totals when data exists", async () => {
    const res = await app.request(
      "/api/v1/analytics/monthly-report?year=2026&month=2",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{
      totalWorkouts: number;
      totalVolume: number;
      muscleDistribution: unknown[];
    }>();
    expect(data.totalWorkouts).toBe(1);
    expect(data.totalVolume).toBe(500);
    expect(data.muscleDistribution.length).toBeGreaterThan(0);
  });

  it("muscle-distribution totalSets reflects logged sets", async () => {
    const res = await app.request(
      "/api/v1/analytics/muscle-distribution",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ totalSets: number }>();
    expect(data.totalSets).toBe(1);
  });

  it("year-in-review shows workout from current year", async () => {
    const res = await app.request(
      "/api/v1/analytics/year-in-review?year=2026",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ totalWorkouts: number }>();
    expect(data.totalWorkouts).toBe(1);
  });
});

describe("Analytics — exercise performance drill-down", () => {
  let token: string;

  beforeEach(async () => {
    ({ token } = await registerUser("perf@example.com", "password123", "Perf User"));

    for (const [startTime, weight, reps] of [
      ["2026-02-01T10:00:00Z", 80, 10],
      ["2026-02-15T10:00:00Z", 90, 8],
    ] as [string, number, number][]) {
      const wRes = await app.request(
        "/api/v1/workouts/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: "Session", start_time: startTime }),
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
          body: JSON.stringify({ workout_exercise_id: workoutExercise.id, weight, reps }),
        },
        env,
      );
    }
  });

  it("returns 1RM, max weight, and history across two sessions", async () => {
    const res = await app.request(
      "/api/v1/analytics/performance?exerciseId=ex_bench_press",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{
      exercise: { id: string };
      oneRepMaxCurve: { date: string; value: number }[];
      maxWeightCurve: { date: string; value: number }[];
      history: unknown[];
    }>();
    expect(data.exercise.id).toBe("ex_bench_press");
    expect(data.oneRepMaxCurve.length).toBe(2);
    expect(data.maxWeightCurve.length).toBe(2);
    expect(data.maxWeightCurve[0].value).toBe(80);
    expect(data.maxWeightCurve[1].value).toBe(90);
    expect(data.history.length).toBe(2);
  });
});
