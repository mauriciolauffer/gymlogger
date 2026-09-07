import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("Exercises extended coverage", () => {
  let token: string;
  let customExerciseId: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Exercise Tester",
          email: "exercises-ext@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;

    const createRes = await app.request(
      "/api/v1/exercises",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: "My Custom Exercise",
          category: "chest",
          body_part: "chest",
          equipment: "cable",
          muscle_group_id: "mg_chest",
          target: "pectoralis major",
          instruction_steps: ["Step 1", "Step 2"],
          secondary_muscle_ids: ["mg_shoulders"],
        }),
      },
      env,
    );
    const createData = await createRes.json();
    customExerciseId = createData.exercise.id;
  });

  it("GET /exercises with query filters", async () => {
    const res = await app.request(
      "/api/v1/exercises?q=Bench&category=chest&custom=false",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.exercises)).toBe(true);
  });

  it("GET /exercises with custom=true filter", async () => {
    const res = await app.request(
      "/api/v1/exercises?custom=true",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.exercises.some((e: { id: string }) => e.id === customExerciseId)).toBe(true);
  });

  it("GET /exercises with bodyPart/equipment/target/muscleGroupId filters", async () => {
    const res = await app.request(
      "/api/v1/exercises?bodyPart=chest&equipment=barbell&target=pectoralis+major&muscleGroupId=mg_chest",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("GET /exercises/:id returns 404 for unknown id", async () => {
    const res = await app.request(
      "/api/v1/exercises/nonexistent",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("POST /exercises returns 400 when required fields missing", async () => {
    const res = await app.request(
      "/api/v1/exercises",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "No Category" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("PUT /exercises/:id updates a custom exercise", async () => {
    const res = await app.request(
      `/api/v1/exercises/${customExerciseId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: "Updated Exercise",
          category: "shoulders",
          body_part: "shoulders",
          equipment: "dumbbell",
          muscle_group_id: "mg_shoulders",
          target: "deltoids",
          instruction_steps: ["New step 1"],
          secondary_muscle_ids: ["mg_chest"],
        }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.exercise.name).toBe("Updated Exercise");
  });

  it("PUT /exercises/:id with empty patch (no fields) still returns 200", async () => {
    const res = await app.request(
      `/api/v1/exercises/${customExerciseId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("PUT /exercises/:id returns 404 for non-custom or foreign exercise", async () => {
    const res = await app.request(
      "/api/v1/exercises/ex_bench_press",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "Hacked" }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("DELETE /exercises/:id deletes a custom exercise", async () => {
    const res = await app.request(
      `/api/v1/exercises/${customExerciseId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe("Custom exercise deleted");
  });

  it("DELETE /exercises/:id returns 404 for non-custom exercise", async () => {
    const res = await app.request(
      "/api/v1/exercises/ex_bench_press",
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );
    expect(res.status).toBe(404);
  });
});
