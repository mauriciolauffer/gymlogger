import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("REQ-05: Exercise Performance Drill-Down", () => {
  let token: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Perf User",
          email: "perf@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;

    const w1Res = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "Session 1", start_time: "2026-02-01T10:00:00Z" }),
      },
      env,
    );
    const { workout: w1 } = await w1Res.json();

    const addEx1 = await app.request(
      `/api/v1/workouts/${w1.id}/exercises`,
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
    const { workoutExercise: we1 } = await addEx1.json();

    await app.request(
      `/api/v1/workouts/${w1.id}/sets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workout_exercise_id: we1.id, weight: 80, reps: 10 }),
      },
      env,
    );

    const w2Res = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "Session 2", start_time: "2026-02-15T10:00:00Z" }),
      },
      env,
    );
    const { workout: w2 } = await w2Res.json();

    const addEx2 = await app.request(
      `/api/v1/workouts/${w2.id}/exercises`,
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
    const { workoutExercise: we2 } = await addEx2.json();

    await app.request(
      `/api/v1/workouts/${w2.id}/sets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workout_exercise_id: we2.id, weight: 90, reps: 8 }),
      },
      env,
    );
  });

  it("fetches exercise 1RM, max weight, max reps progression curves and session history", async () => {
    const res = await app.request(
      "/api/v1/analytics/performance?exerciseId=ex_bench_press",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.exercise.id).toBe("ex_bench_press");
    expect(data.oneRepMaxCurve.length).toBe(2);
    expect(data.maxWeightCurve.length).toBe(2);
    expect(data.maxWeightCurve[0].value).toBe(80);
    expect(data.maxWeightCurve[1].value).toBe(90);
    expect(data.history.length).toBe(2);
  });
});
