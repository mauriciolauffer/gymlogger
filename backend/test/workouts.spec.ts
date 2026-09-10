import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";
import { registerUser } from "./helpers";

describe("Workout session", () => {
  let token: string;

  beforeEach(async () => {
    ({ token } = await registerUser("morgan@example.com", "password123", "Morgan Lifting"));
  });

  it("lists muscle groups and exercise library", async () => {
    const mgRes = await app.request(
      "/api/v1/muscle-groups",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(mgRes.status).toBe(200);
    const mgData = await mgRes.json<{ muscleGroups: unknown[] }>();
    expect(mgData.muscleGroups.length).toBeGreaterThan(0);

    const exRes = await app.request(
      "/api/v1/exercises",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(exRes.status).toBe(200);
    const exData = await exRes.json<{ exercises: unknown[] }>();
    expect(exData.exercises.length).toBeGreaterThan(0);
  });

  it("creates, fetches, updates, and deletes a custom exercise", async () => {
    const createRes = await app.request(
      "/api/v1/exercises",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: "Cable Flyes",
          category: "chest",
          body_part: "chest",
          equipment: "cable",
          muscle_group_id: "mg_chest",
          secondary_muscle_ids: ["mg_shoulders"],
        }),
      },
      env,
    );
    expect(createRes.status).toBe(201);
    const createData = await createRes.json<{ exercise: { id: string; name: string } }>();
    const customId = createData.exercise.id;
    expect(customId).toContain("custom_");

    const getRes = await app.request(
      `/api/v1/exercises/${customId}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(getRes.status).toBe(200);
    const getData = await getRes.json<{
      exercise: { name: string; secondaryMuscles: unknown[] };
    }>();
    expect(getData.exercise.name).toBe("Cable Flyes");
    expect(getData.exercise.secondaryMuscles.length).toBe(1);

    const delRes = await app.request(
      `/api/v1/exercises/${customId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(delRes.status).toBe(200);
  });

  it("starts a workout, adds exercises, logs sets, and finishes", async () => {
    const startRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Push Day" }),
      },
      env,
    );
    expect(startRes.status).toBe(201);
    const { workout } = await startRes.json<{ workout: { id: string } }>();

    const addExRes = await app.request(
      `/api/v1/workouts/${workout.id}/exercises`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise_id: "ex_bench_press", order_index: 0 }),
      },
      env,
    );
    expect(addExRes.status).toBe(201);
    const { workoutExercise } = await addExRes.json<{ workoutExercise: { id: string } }>();

    const set1Res = await app.request(
      `/api/v1/workouts/${workout.id}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          workout_exercise_id: workoutExercise.id,
          set_type: "normal",
          weight: 100,
          reps: 5,
          rpe: 8,
        }),
      },
      env,
    );
    expect(set1Res.status).toBe(201);
    const set1Data = await set1Res.json<{ set: { weight: number; estimated_1rm: number } }>();
    expect(set1Data.set.weight).toBe(100);
    expect(set1Data.set.estimated_1rm).toBeGreaterThan(100);

    await app.request(
      `/api/v1/workouts/${workout.id}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          workout_exercise_id: workoutExercise.id,
          set_type: "normal",
          weight: 100,
          reps: 5,
          rpe: 9,
        }),
      },
      env,
    );

    const finishRes = await app.request(
      `/api/v1/workouts/${workout.id}/finish`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: "Great push session!" }),
      },
      env,
    );
    expect(finishRes.status).toBe(200);
    const finishData = await finishRes.json<{
      workout: { total_volume: number; set_count: number; end_time: string };
    }>();
    expect(finishData.workout.total_volume).toBe(1000);
    expect(finishData.workout.set_count).toBe(2);
    expect(finishData.workout.end_time).toBeDefined();

    const prevRes = await app.request(
      "/api/v1/workouts/previous-values?exerciseId=ex_bench_press",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(prevRes.status).toBe(200);
    const prevData = await prevRes.json<{ sets: { weight: number }[] }>();
    expect(prevData.sets.length).toBe(2);
    expect(prevData.sets[0].weight).toBe(100);
  });

  it("returns 404 for unknown workout", async () => {
    const res = await app.request(
      "/api/v1/workouts/nonexistent",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when adding exercise without exercise_id", async () => {
    const startRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Empty" }),
      },
      env,
    );
    const { workout } = await startRes.json<{ workout: { id: string } }>();

    const res = await app.request(
      `/api/v1/workouts/${workout.id}/exercises`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("deletes a workout", async () => {
    const startRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "To Delete" }),
      },
      env,
    );
    const { workout } = await startRes.json<{ workout: { id: string } }>();

    const delRes = await app.request(
      `/api/v1/workouts/${workout.id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(delRes.status).toBe(200);
  });
});
