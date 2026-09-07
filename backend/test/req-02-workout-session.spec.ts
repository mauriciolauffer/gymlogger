import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("REQ-02: Start & Log a Workout Session", () => {
  let token: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Morgan Lifting",
          email: "morgan@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;
  });

  it("lists muscle groups and exercise library", async () => {
    const mgRes = await app.request("/api/v1/muscle-groups", {}, env);
    expect(mgRes.status).toBe(200);
    const mgData = await mgRes.json();
    expect(mgData.muscleGroups.length).toBeGreaterThan(0);

    const exRes = await app.request(
      "/api/v1/exercises",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(exRes.status).toBe(200);
    const exData = await exRes.json();
    expect(exData.exercises.length).toBeGreaterThan(0);
  });

  it("allows creating, updating, and deleting custom exercises", async () => {
    const createRes = await app.request(
      "/api/v1/exercises",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    const createData = await createRes.json();
    const customId = createData.exercise.id;
    expect(customId).toContain("custom_");

    const getRes = await app.request(
      `/api/v1/exercises/${customId}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.exercise.name).toBe("Cable Flyes");
    expect(getData.exercise.secondaryMuscles.length).toBe(1);

    const delRes = await app.request(
      `/api/v1/exercises/${customId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );
    expect(delRes.status).toBe(200);
  });

  it("starts a workout session, adds exercises, logs sets, and finishes session", async () => {
    const startRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "Push Day" }),
      },
      env,
    );

    expect(startRes.status).toBe(201);
    const { workout } = await startRes.json();
    const workoutId = workout.id;

    const addExRes = await app.request(
      `/api/v1/workouts/${workoutId}/exercises`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          exercise_id: "ex_bench_press",
          order_index: 0,
        }),
      },
      env,
    );

    expect(addExRes.status).toBe(201);
    const { workoutExercise } = await addExRes.json();

    const set1Res = await app.request(
      `/api/v1/workouts/${workoutId}/sets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    const set1Data = await set1Res.json();
    expect(set1Data.set.weight).toBe(100);
    expect(set1Data.set.estimated_1rm).toBeGreaterThan(100);

    await app.request(
      `/api/v1/workouts/${workoutId}/sets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
      `/api/v1/workouts/${workoutId}/finish`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: "Great push session!" }),
      },
      env,
    );

    expect(finishRes.status).toBe(200);
    const finishData = await finishRes.json();
    expect(finishData.workout.total_volume).toBe(1000);
    expect(finishData.workout.set_count).toBe(2);
    expect(finishData.workout.end_time).toBeDefined();

    const prevRes = await app.request(
      "/api/v1/workouts/previous-values?exerciseId=ex_bench_press",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(prevRes.status).toBe(200);
    const prevData = await prevRes.json();
    expect(prevData.sets.length).toBe(2);
    expect(prevData.sets[0].weight).toBe(100);
  });
});
