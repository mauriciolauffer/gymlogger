import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";
import { registerUser } from "./helpers";

describe("Personal record detection", () => {
  let token: string;

  beforeEach(async () => {
    ({ token } = await registerUser("pr@example.com", "password123", "PR Athlete"));
  });

  it("flags a set as PR when it is the first for an exercise", async () => {
    const startRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Bench Day" }),
      },
      env,
    );
    const { workout } = await startRes.json<{ workout: { id: string } }>();

    const addExRes = await app.request(
      `/api/v1/workouts/${workout.id}/exercises`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise_id: "ex_bench_press" }),
      },
      env,
    );
    const { workoutExercise } = await addExRes.json<{ workoutExercise: { id: string } }>();

    const set1Res = await app.request(
      `/api/v1/workouts/${workout.id}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workout_exercise_id: workoutExercise.id, weight: 100, reps: 5 }),
      },
      env,
    );
    expect(set1Res.status).toBe(201);
    const set1Data = await set1Res.json<{ isPr: boolean; set: { is_pr: number } }>();
    expect(set1Data.isPr).toBe(true);
    expect(set1Data.set.is_pr).toBe(1);

    const prRes = await app.request(
      "/api/v1/personal-records?exerciseId=ex_bench_press",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(prRes.status).toBe(200);
    const prData = await prRes.json<{ personalRecords: unknown[] }>();
    expect(prData.personalRecords.length).toBeGreaterThan(0);
  });

  it("flags a heavier set as PR", async () => {
    const startRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Bench Day 2" }),
      },
      env,
    );
    const { workout } = await startRes.json<{ workout: { id: string } }>();
    const addExRes = await app.request(
      `/api/v1/workouts/${workout.id}/exercises`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise_id: "ex_bench_press" }),
      },
      env,
    );
    const { workoutExercise } = await addExRes.json<{ workoutExercise: { id: string } }>();

    await app.request(
      `/api/v1/workouts/${workout.id}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workout_exercise_id: workoutExercise.id, weight: 100, reps: 5 }),
      },
      env,
    );
    const set2Res = await app.request(
      `/api/v1/workouts/${workout.id}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workout_exercise_id: workoutExercise.id, weight: 120, reps: 5 }),
      },
      env,
    );
    const set2Data = await set2Res.json<{ isPr: boolean }>();
    expect(set2Data.isPr).toBe(true);
  });

  it("does not flag a lighter set as PR", async () => {
    const startRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Bench Day 3" }),
      },
      env,
    );
    const { workout } = await startRes.json<{ workout: { id: string } }>();
    const addExRes = await app.request(
      `/api/v1/workouts/${workout.id}/exercises`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise_id: "ex_bench_press" }),
      },
      env,
    );
    const { workoutExercise } = await addExRes.json<{ workoutExercise: { id: string } }>();

    await app.request(
      `/api/v1/workouts/${workout.id}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workout_exercise_id: workoutExercise.id, weight: 120, reps: 5 }),
      },
      env,
    );
    const set2Res = await app.request(
      `/api/v1/workouts/${workout.id}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workout_exercise_id: workoutExercise.id, weight: 110, reps: 5 }),
      },
      env,
    );
    const set2Data = await set2Res.json<{ isPr: boolean }>();
    expect(set2Data.isPr).toBe(false);
  });
});
