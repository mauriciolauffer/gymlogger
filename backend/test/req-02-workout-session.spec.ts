import { describe, expect, it, beforeEach } from "vitest";
import app from "../src/index";
import { createMockD1 } from "../src/db/d1-mock";

describe("REQ-02: Start & Log a Workout Session", () => {
  let db: D1Database;
  let token: string;

  beforeEach(async () => {
    db = createMockD1();
    const regRes = await app.request(
      new Request("http://localhost/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Morgan Lifting",
          email: "morgan@example.com",
          password: "password123",
        }),
      }),
      {},
      { DB: db },
    );
    const data = await regRes.json();
    token = data.token;
  });

  it("lists muscle groups and exercise library", async () => {
    const mgRes = await app.request(
      new Request("http://localhost/api/v1/muscle-groups"),
      {},
      { DB: db },
    );
    expect(mgRes.status).toBe(200);
    const mgData = await mgRes.json();
    expect(mgData.muscleGroups.length).toBeGreaterThan(0);

    const exRes = await app.request(
      new Request("http://localhost/api/v1/exercises", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
    );
    expect(exRes.status).toBe(200);
    const exData = await exRes.json();
    expect(exData.exercises.length).toBeGreaterThan(0);
  });

  it("allows creating, updating, and deleting custom exercises", async () => {
    // Create custom exercise
    const createRes = await app.request(
      new Request("http://localhost/api/v1/exercises", {
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
      }),
      {},
      { DB: db },
    );

    expect(createRes.status).toBe(201);
    const createData = await createRes.json();
    const customId = createData.exercise.id;
    expect(customId).toContain("custom_");

    // Fetch single
    const getRes = await app.request(
      new Request(`http://localhost/api/v1/exercises/${customId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
    );
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.exercise.name).toBe("Cable Flyes");
    expect(getData.exercise.secondaryMuscles.length).toBe(1);

    // Delete custom exercise
    const delRes = await app.request(
      new Request(`http://localhost/api/v1/exercises/${customId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
    );
    expect(delRes.status).toBe(200);
  });

  it("starts a workout session, adds exercises, logs sets, and finishes session", async () => {
    // Start workout
    const startRes = await app.request(
      new Request("http://localhost/api/v1/workouts/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "Push Day" }),
      }),
      {},
      { DB: db },
    );

    expect(startRes.status).toBe(201);
    const { workout } = await startRes.json();
    const workoutId = workout.id;

    // Add Bench Press exercise to workout
    const addExRes = await app.request(
      new Request(`http://localhost/api/v1/workouts/${workoutId}/exercises`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          exercise_id: "ex_bench_press",
          order_index: 0,
        }),
      }),
      {},
      { DB: db },
    );

    expect(addExRes.status).toBe(201);
    const { workoutExercise } = await addExRes.json();

    // Log Set 1: 100kg x 5 reps
    const set1Res = await app.request(
      new Request(`http://localhost/api/v1/workouts/${workoutId}/sets`, {
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
      }),
      {},
      { DB: db },
    );

    expect(set1Res.status).toBe(201);
    const set1Data = await set1Res.json();
    expect(set1Data.set.weight).toBe(100);
    expect(set1Data.set.estimated_1rm).toBeGreaterThan(100);

    // Log Set 2: 100kg x 5 reps
    await app.request(
      new Request(`http://localhost/api/v1/workouts/${workoutId}/sets`, {
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
      }),
      {},
      { DB: db },
    );

    // Finish workout
    const finishRes = await app.request(
      new Request(`http://localhost/api/v1/workouts/${workoutId}/finish`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: "Great push session!" }),
      }),
      {},
      { DB: db },
    );

    expect(finishRes.status).toBe(200);
    const finishData = await finishRes.json();
    expect(finishData.workout.total_volume).toBe(1000); // 100*5 + 100*5
    expect(finishData.workout.set_count).toBe(2);
    expect(finishData.workout.end_time).toBeDefined();

    // Query previous values for bench press in subsequent session
    const prevRes = await app.request(
      new Request("http://localhost/api/v1/workouts/previous-values?exerciseId=ex_bench_press", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
    );

    expect(prevRes.status).toBe(200);
    const prevData = await prevRes.json();
    expect(prevData.sets.length).toBe(2);
    expect(prevData.sets[0].weight).toBe(100);
  });
});
