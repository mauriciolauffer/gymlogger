import { describe, expect, it, beforeEach } from "vitest";
import app from "../src/index";
import { createMockD1 } from "../src/db/d1-mock";

describe("REQ-03: Live Personal Record Detection", () => {
  let db: D1Database;
  let token: string;

  beforeEach(async () => {
    db = createMockD1();
    const regRes = await app.request(
      new Request("http://localhost/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "PR Athlete",
          email: "pr@example.com",
          password: "password123",
        }),
      }),
      {},
      { DB: db },
    );
    const data = await regRes.json();
    token = data.token;
  });

  it("detects PR when a new record is set and stores in personal_records", async () => {
    // Start workout session
    const startRes = await app.request(
      new Request("http://localhost/api/v1/workouts/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "Bench Day" }),
      }),
      {},
      { DB: db },
    );
    const { workout } = await startRes.json();

    // Add bench press
    const addExRes = await app.request(
      new Request(`http://localhost/api/v1/workouts/${workout.id}/exercises`, {
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
    const { workoutExercise } = await addExRes.json();

    // Log Set 1: 100kg x 5 reps -> new PR
    const set1Res = await app.request(
      new Request(`http://localhost/api/v1/workouts/${workout.id}/sets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workout_exercise_id: workoutExercise.id,
          weight: 100,
          reps: 5,
        }),
      }),
      {},
      { DB: db },
    );

    expect(set1Res.status).toBe(201);
    const set1Data = await set1Res.json();
    expect(set1Data.isPr).toBe(true);
    expect(set1Data.set.is_pr).toBe(1);

    // Query personal records
    const prRes = await app.request(
      new Request("http://localhost/api/v1/personal-records?exerciseId=ex_bench_press", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
    );

    expect(prRes.status).toBe(200);
    const prData = await prRes.json();
    expect(prData.personalRecords.length).toBeGreaterThan(0);

    // Log Set 2: 120kg x 5 reps -> Beats previous PR!
    const set2Res = await app.request(
      new Request(`http://localhost/api/v1/workouts/${workout.id}/sets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workout_exercise_id: workoutExercise.id,
          weight: 120,
          reps: 5,
        }),
      }),
      {},
      { DB: db },
    );

    const set2Data = await set2Res.json();
    expect(set2Data.isPr).toBe(true);

    // Log Set 3: 110kg x 5 reps -> Does NOT beat 120kg PR!
    const set3Res = await app.request(
      new Request(`http://localhost/api/v1/workouts/${workout.id}/sets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workout_exercise_id: workoutExercise.id,
          weight: 110,
          reps: 5,
        }),
      }),
      {},
      { DB: db },
    );

    const set3Data = await set3Res.json();
    expect(set3Data.isPr).toBe(false);
  });
});
