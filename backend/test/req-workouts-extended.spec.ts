import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("Workouts extended coverage", () => {
  let token: string;
  let workoutId: string;
  let workoutExerciseId: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Workout Tester",
          email: "workouts-ext@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;

    const startRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Test Workout" }),
      },
      env,
    );
    const startData = await startRes.json();
    workoutId = startData.workout.id;

    const addExRes = await app.request(
      `/api/v1/workouts/${workoutId}/exercises`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise_id: "ex_bench_press", order_index: 0 }),
      },
      env,
    );
    const addExData = await addExRes.json();
    workoutExerciseId = addExData.workoutExercise.id;
  });

  it("GET /workouts returns list", async () => {
    const res = await app.request(
      "/api/v1/workouts",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.workouts)).toBe(true);
    expect(data.workouts.length).toBeGreaterThan(0);
  });

  it("GET /workouts with from/to filters", async () => {
    const res = await app.request(
      "/api/v1/workouts?from=2020-01-01&to=2099-12-31",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.workouts)).toBe(true);
  });

  it("GET /workouts/:id returns workout with exercises", async () => {
    const res = await app.request(
      `/api/v1/workouts/${workoutId}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.workout.id).toBe(workoutId);
    expect(Array.isArray(data.workout.exercises)).toBe(true);
  });

  it("GET /workouts/:id returns 404 for unknown id", async () => {
    const res = await app.request(
      "/api/v1/workouts/nonexistent",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("PUT /:id/finish completes a workout", async () => {
    const res = await app.request(
      `/api/v1/workouts/${workoutId}/finish`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: "Done!" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.workout.end_time).toBeDefined();
    expect(data.workout.duration_seconds).toBeGreaterThanOrEqual(0);
  });

  it("PUT /:id/finish returns 404 for unknown workout", async () => {
    const res = await app.request(
      "/api/v1/workouts/nonexistent/finish",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("PUT /:id/sets/:setId updates a set", async () => {
    const addSetRes = await app.request(
      `/api/v1/workouts/${workoutId}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          workout_exercise_id: workoutExerciseId,
          weight: 80,
          reps: 8,
        }),
      },
      env,
    );
    const setData = await addSetRes.json();
    const setId = setData.set.id;

    const updateRes = await app.request(
      `/api/v1/workouts/${workoutId}/sets/${setId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weight: 90, reps: 6 }),
      },
      env,
    );
    expect(updateRes.status).toBe(200);
    const updateData = await updateRes.json();
    expect(updateData.set.weight).toBe(90);
    expect(updateData.set.reps).toBe(6);
  });

  it("PUT /:id/sets/:setId returns 404 for unknown set", async () => {
    const res = await app.request(
      `/api/v1/workouts/${workoutId}/sets/nonexistent`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weight: 90 }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("DELETE /:id/sets/:setId deletes a set", async () => {
    const addSetRes = await app.request(
      `/api/v1/workouts/${workoutId}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          workout_exercise_id: workoutExerciseId,
          weight: 60,
          reps: 10,
        }),
      },
      env,
    );
    const setData = await addSetRes.json();
    const setId = setData.set.id;

    const delRes = await app.request(
      `/api/v1/workouts/${workoutId}/sets/${setId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );
    expect(delRes.status).toBe(200);
    const delData = await delRes.json();
    expect(delData.message).toBe("Set deleted");
  });

  it("DELETE /:id/sets/:setId returns 404 for unknown set", async () => {
    const res = await app.request(
      `/api/v1/workouts/${workoutId}/sets/nonexistent`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("DELETE /:id deletes a workout", async () => {
    const res = await app.request(
      `/api/v1/workouts/${workoutId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe("Workout deleted");
  });

  it("DELETE /:id returns 404 for unknown workout", async () => {
    const res = await app.request(
      "/api/v1/workouts/nonexistent",
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("POST /:id/exercises returns 400 when exercise_id missing", async () => {
    const res = await app.request(
      `/api/v1/workouts/${workoutId}/exercises`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("POST /:id/exercises returns 404 for unknown workout", async () => {
    const res = await app.request(
      "/api/v1/workouts/nonexistent/exercises",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise_id: "ex_bench_press" }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("POST /:id/sets returns 400 when workout_exercise_id missing", async () => {
    const res = await app.request(
      `/api/v1/workouts/${workoutId}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weight: 100, reps: 5 }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("POST /:id/sets returns 404 for unknown workout", async () => {
    const res = await app.request(
      "/api/v1/workouts/nonexistent/sets",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workout_exercise_id: workoutExerciseId }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("requires auth for workout routes", async () => {
    const res = await app.request("/api/v1/workouts", {}, env);
    expect(res.status).toBe(401);
  });

  it("starts workout from template", async () => {
    const templateRes = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: "My Template",
          exercises: [{ exercise_id: "ex_bench_press", order_index: 0 }],
        }),
      },
      env,
    );
    const templateData = await templateRes.json();
    const templateId = templateData.template.id;

    const startRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "From Template", template_id: templateId }),
      },
      env,
    );
    expect(startRes.status).toBe(201);
    const startData = await startRes.json();
    expect(startData.workout.templateId).toBe(templateId);
  });

  it("GET /workouts/:id returns exercises with sets", async () => {
    await app.request(
      `/api/v1/workouts/${workoutId}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          workout_exercise_id: workoutExerciseId,
          weight: 100,
          reps: 5,
        }),
      },
      env,
    );

    const res = await app.request(
      `/api/v1/workouts/${workoutId}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.workout.exercises[0].sets.length).toBeGreaterThan(0);
  });
});
