import { describe, expect, it, beforeEach } from "vitest";
import app from "../src/index";
import { createMockD1 } from "../src/db/d1-mock";

describe("REQ-05: Exercise Performance Drill-Down", () => {
  let db: D1Database;
  let token: string;

  beforeEach(async () => {
    db = createMockD1();
    const regRes = await app.request(
      new Request("http://localhost/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Perf User",
          email: "perf@example.com",
          password: "password123",
        }),
      }),
      {},
      { DB: db },
    );
    const data = await regRes.json();
    token = data.token;

    // Start workout 1 and log bench press
    const w1Res = await app.request(
      new Request("http://localhost/api/v1/workouts/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "Session 1", start_time: "2026-02-01T10:00:00Z" }),
      }),
      {},
      { DB: db },
    );
    const { workout: w1 } = await w1Res.json();

    const addEx1 = await app.request(
      new Request(`http://localhost/api/v1/workouts/${w1.id}/exercises`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ exercise_id: "ex_bench_press" }),
      }),
      {},
      { DB: db },
    );
    const { workoutExercise: we1 } = await addEx1.json();

    await app.request(
      new Request(`http://localhost/api/v1/workouts/${w1.id}/sets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workout_exercise_id: we1.id, weight: 80, reps: 10 }),
      }),
      {},
      { DB: db },
    );

    // Start workout 2 and log heavier bench press
    const w2Res = await app.request(
      new Request("http://localhost/api/v1/workouts/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "Session 2", start_time: "2026-02-15T10:00:00Z" }),
      }),
      {},
      { DB: db },
    );
    const { workout: w2 } = await w2Res.json();

    const addEx2 = await app.request(
      new Request(`http://localhost/api/v1/workouts/${w2.id}/exercises`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ exercise_id: "ex_bench_press" }),
      }),
      {},
      { DB: db },
    );
    const { workoutExercise: we2 } = await addEx2.json();

    await app.request(
      new Request(`http://localhost/api/v1/workouts/${w2.id}/sets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workout_exercise_id: we2.id, weight: 90, reps: 8 }),
      }),
      {},
      { DB: db },
    );
  });

  it("fetches exercise 1RM, max weight, max reps progression curves and session history", async () => {
    const res = await app.request(
      new Request("http://localhost/api/v1/analytics/performance?exerciseId=ex_bench_press", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
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
