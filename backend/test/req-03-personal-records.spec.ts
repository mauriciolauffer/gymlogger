import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("REQ-03: Live Personal Record Detection", () => {
  let token: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "PR Athlete",
          email: "pr@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;
  });

  it("detects PR when a new record is set and stores in personal_records", async () => {
    const startRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "Bench Day" }),
      },
      env,
    );
    const { workout } = await startRes.json();

    const addExRes = await app.request(
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
    const { workoutExercise } = await addExRes.json();

    const set1Res = await app.request(
      `/api/v1/workouts/${workout.id}/sets`,
      {
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
      },
      env,
    );

    expect(set1Res.status).toBe(201);
    const set1Data = await set1Res.json();
    expect(set1Data.isPr).toBe(true);
    expect(set1Data.set.is_pr).toBe(1);

    const prRes = await app.request(
      "/api/v1/personal-records?exerciseId=ex_bench_press",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(prRes.status).toBe(200);
    const prData = await prRes.json();
    expect(prData.personalRecords.length).toBeGreaterThan(0);

    const set2Res = await app.request(
      `/api/v1/workouts/${workout.id}/sets`,
      {
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
      },
      env,
    );

    const set2Data = await set2Res.json();
    expect(set2Data.isPr).toBe(true);

    const set3Res = await app.request(
      `/api/v1/workouts/${workout.id}/sets`,
      {
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
      },
      env,
    );

    const set3Data = await set3Res.json();
    expect(set3Data.isPr).toBe(false);
  });
});
