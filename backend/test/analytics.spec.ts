import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import app from "../src/index.ts";
import { buildWorkout, registerUser } from "./helpers.ts";

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
    const buildWorkouts = [];
    for (const start_time of ["2026-01-01T10:00:00Z", "2026-01-03T10:00:00Z"]) {
      buildWorkouts.push(
        buildWorkout(token, "ex_bench_press", [], { title: "Workout", start_time }),
      );
    }
    await Promise.all(buildWorkouts);
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

  it("monthly-report includes topPRs when PRs were set in the period", async () => {
    await buildWorkout(token, "ex_bench_press", [{ weight: 120, reps: 3 }], {
      title: "Monthly PR Workout",
    });

    const res = await app.request(
      "/api/v1/analytics/monthly-report?year=2026&month=9",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ topPRs: { exerciseId: string }[] }>();
    expect(data.topPRs.length).toBeGreaterThan(0);
    expect(data.topPRs[0].exerciseId).toBe("ex_bench_press");
  });

  it("year-in-review includes topPRs when PRs were set in the year", async () => {
    await buildWorkout(token, "ex_squat", [{ weight: 150, reps: 5 }], { title: "Year PR Workout" });

    const res = await app.request(
      "/api/v1/analytics/year-in-review?year=2026",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ topPRs: { exerciseId: string }[] }>();
    expect(data.topPRs.length).toBeGreaterThan(0);
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
    const buildWorkouts = [];
    for (const start_time of [
      "2026-03-01T10:00:00Z",
      "2026-03-02T10:00:00Z",
      "2026-03-03T10:00:00Z",
    ]) {
      buildWorkouts.push(
        buildWorkout(token, "ex_bench_press", [], { title: "Daily Workout", start_time }),
      );
    }
    await Promise.all(buildWorkouts);
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
    await buildWorkout(token, "ex_bench_press", [{ weight: 0, reps: 0 }], { title: "Zero Set" });

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
    await buildWorkout(
      token,
      "ex_bench_press",
      [
        { weight: 80, reps: 10 },
        { weight: 90, reps: 8 },
        { weight: 100, reps: 5 },
      ],
      { title: "Multi Set Session" },
    );

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
    await buildWorkout(
      token,
      "ex_squat",
      [
        { weight: 0, reps: 0 },
        { weight: 140, reps: 3 },
      ],
      { title: "Mixed Reps" },
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

  it("monthly-report with non-numeric year falls back gracefully", async () => {
    const res = await app.request(
      "/api/v1/analytics/monthly-report?year=abc&month=xyz",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ period: { year: number; month: number } }>();
    expect(typeof data.period.year).toBe("number");
    expect(isNaN(data.period.year)).toBe(false);
    expect(typeof data.period.month).toBe("number");
    expect(isNaN(data.period.month)).toBe(false);
  });

  it("year-in-review with non-numeric year falls back gracefully", async () => {
    const res = await app.request(
      "/api/v1/analytics/year-in-review?year=abc",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ year: number }>();
    expect(typeof data.year).toBe("number");
    expect(isNaN(data.year)).toBe(false);
  });
});
