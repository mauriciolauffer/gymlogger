import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import app from "../src/index";
import { buildWorkout, registerUser } from "./helpers";

describe("Personal record detection", () => {
  let token: string;

  beforeEach(async () => {
    ({ token } = await registerUser("pr@example.com", "password123", "PR Athlete"));
  });

  it("flags a set as PR when it is the first for an exercise", async () => {
    const { workoutId, workoutExerciseId } = await buildWorkout(
      token, "ex_bench_press", [], { title: "Bench Day" },
    );
    const setRes = await app.request(
      `/api/v1/workouts/${workoutId}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workout_exercise_id: workoutExerciseId, weight: 100, reps: 5 }),
      },
      env,
    );
    expect(setRes.status).toBe(201);
    const setData = await setRes.json<{ isPr: boolean; set: { is_pr: number } }>();
    expect(setData.isPr).toBe(true);
    expect(setData.set.is_pr).toBe(1);

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
    const { workoutId, workoutExerciseId } = await buildWorkout(
      token,
      "ex_bench_press",
      [{ weight: 100, reps: 5 }],
      { title: "Bench Day 2" },
    );
    const set2Res = await app.request(
      `/api/v1/workouts/${workoutId}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workout_exercise_id: workoutExerciseId, weight: 120, reps: 5 }),
      },
      env,
    );
    const set2Data = await set2Res.json<{ isPr: boolean }>();
    expect(set2Data.isPr).toBe(true);
  });

  it("does not flag a lighter set as PR", async () => {
    const { workoutId, workoutExerciseId } = await buildWorkout(
      token,
      "ex_bench_press",
      [{ weight: 120, reps: 5 }],
      { title: "Bench Day 3" },
    );
    const set2Res = await app.request(
      `/api/v1/workouts/${workoutId}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workout_exercise_id: workoutExerciseId, weight: 110, reps: 5 }),
      },
      env,
    );
    const set2Data = await set2Res.json<{ isPr: boolean }>();
    expect(set2Data.isPr).toBe(false);
  });

  it("filters personal records by exerciseId", async () => {
    await buildWorkout(token, "ex_bench_press", [{ weight: 100, reps: 5 }], { title: "PR Workout" });

    const res = await app.request(
      "/api/v1/personal-records?exerciseId=ex_bench_press",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ personalRecords: { exerciseId: string }[] }>();
    expect(data.personalRecords.length).toBeGreaterThan(0);
    expect(data.personalRecords.every((r) => r.exerciseId === "ex_bench_press")).toBe(true);
  });

  it("lists all personal records without exerciseId filter", async () => {
    const res = await app.request(
      "/api/v1/personal-records",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ personalRecords: unknown[] }>();
    expect(Array.isArray(data.personalRecords)).toBe(true);
  });

  it("updates PR record when a heavier set is logged in a separate workout", async () => {
    await buildWorkout(token, "ex_squat", [{ weight: 100, reps: 5 }], { title: "PR Cross-workout" });
    const { workoutId, workoutExerciseId } = await buildWorkout(
      token,
      "ex_squat",
      [],
      { title: "PR Cross-workout" },
    );
    const set2Res = await app.request(
      `/api/v1/workouts/${workoutId}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workout_exercise_id: workoutExerciseId, weight: 120, reps: 5 }),
      },
      env,
    );
    const set2Data = await set2Res.json<{ isPr: boolean }>();
    expect(set2Data.isPr).toBe(true);

    const prRes = await app.request(
      "/api/v1/personal-records?exerciseId=ex_squat",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    const { personalRecords } = await prRes.json<{
      personalRecords: { prType: string; value: number }[];
    }>();
    const weightPr = personalRecords.find((r) => r.prType === "WT");
    expect(weightPr?.value).toBe(120);
  });

  it("has_pr is set on the workout that contains the PR set", async () => {
    const { workoutId } = await buildWorkout(
      token,
      "ex_bench_press",
      [{ weight: 100, reps: 5 }],
      { title: "has_pr workout" },
    );

    const getRes = await app.request(
      `/api/v1/workouts/${workoutId}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(getRes.status).toBe(200);
    const { workout: detail } = await getRes.json<{ workout: { hasPr: boolean } }>();
    expect(detail.hasPr).toBe(true);
  });
});
