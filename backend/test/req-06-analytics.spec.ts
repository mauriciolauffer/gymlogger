import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("REQ-06: Monthly Report & Periodic Analytics", () => {
  let token: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Analytics Athlete",
          email: "analytics@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;

    const wRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "Feb Session", start_time: "2026-02-10T10:00:00Z" }),
      },
      env,
    );
    const { workout } = await wRes.json();

    const addEx = await app.request(
      `/api/v1/workouts/${workout.id}/exercises`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ exercise_id: "ex_bench_press" }),
      },
      env,
    );
    const { workoutExercise } = await addEx.json();

    await app.request(
      `/api/v1/workouts/${workout.id}/sets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workout_exercise_id: workoutExercise.id, weight: 100, reps: 5 }),
      },
      env,
    );

    await app.request(
      `/api/v1/workouts/${workout.id}/finish`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
      env,
    );
  });

  it("fetches monthly report summary", async () => {
    const res = await app.request(
      "/api/v1/analytics/monthly-report?year=2026&month=2",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalWorkouts).toBe(1);
    expect(data.totalVolume).toBe(500);
    expect(data.muscleDistribution.length).toBeGreaterThan(0);
  });

  it("fetches muscle distribution and sets per muscle group", async () => {
    const distRes = await app.request(
      "/api/v1/analytics/muscle-distribution",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(distRes.status).toBe(200);
    const distData = await distRes.json();
    expect(distData.totalSets).toBe(1);

    const setsRes = await app.request(
      "/api/v1/analytics/sets-per-muscle-group",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(setsRes.status).toBe(200);
    const setsData = await setsRes.json();
    expect(setsData.setsPerMuscleGroup.length).toBeGreaterThan(0);
  });

  it("fetches consistency streak and year in review", async () => {
    const streakRes = await app.request(
      "/api/v1/analytics/consistency",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(streakRes.status).toBe(200);

    const yirRes = await app.request(
      "/api/v1/analytics/year-in-review?year=2026",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(yirRes.status).toBe(200);
    const yirData = await yirRes.json();
    expect(yirData.totalWorkouts).toBe(1);
  });
});
