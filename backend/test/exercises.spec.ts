import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
import app from "../src/index.ts";
import { registerUser } from "./helpers.ts";

describe("Exercises", () => {
  let token: string;

  beforeEach(async () => {
    ({ token } = await registerUser("exercises@example.com", "password123", "Exercise User"));
  });

  it("lists muscle groups", async () => {
    const res = await app.request(
      "/api/v1/muscle-groups",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ muscleGroups: unknown[] }>();
    expect(data.muscleGroups.length).toBeGreaterThan(0);
  });

  it("lists exercises", async () => {
    const res = await app.request(
      "/api/v1/exercises",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ exercises: unknown[] }>();
    expect(data.exercises.length).toBeGreaterThan(0);
  });

  it("filters exercises by query string", async () => {
    const res = await app.request(
      "/api/v1/exercises?q=bench",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ exercises: { name: string }[] }>();
    expect(data.exercises.every((e) => e.name.toLowerCase().includes("bench"))).toBe(true);
  });

  it("filters exercises by category", async () => {
    const res = await app.request(
      "/api/v1/exercises?category=chest",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ exercises: { category: string }[] }>();
    expect(data.exercises.every((e) => e.category === "chest")).toBe(true);
  });

  it("filters exercises by equipment", async () => {
    const res = await app.request(
      "/api/v1/exercises?equipment=barbell",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ exercises: { equipment: string }[] }>();
    expect(data.exercises.length).toBeGreaterThan(0);
  });

  it("filters exercises by muscleGroupId", async () => {
    const res = await app.request(
      "/api/v1/exercises?muscleGroupId=mg_chest",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ exercises: unknown[] }>();
    expect(data.exercises.length).toBeGreaterThan(0);
  });

  it("lists only custom exercises with custom=true filter", async () => {
    await app.request(
      "/api/v1/exercises",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "My Custom Push", category: "chest", body_part: "chest" }),
      },
      env,
    );

    const res = await app.request(
      "/api/v1/exercises?custom=true",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ exercises: { isCustom: boolean }[] }>();
    expect(data.exercises.every((e) => e.isCustom === true)).toBe(true);
  });

  it("filters exercises by bodyPart", async () => {
    const res = await app.request(
      "/api/v1/exercises?bodyPart=chest",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("filters exercises by target", async () => {
    const res = await app.request(
      "/api/v1/exercises?target=pectorals",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("creates, updates, and deletes a custom exercise with secondary muscles", async () => {
    const createRes = await app.request(
      "/api/v1/exercises",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: "Custom Row",
          category: "back",
          body_part: "back",
          muscle_group_id: "mg_back",
          secondary_muscle_ids: ["mg_biceps"],
        }),
      },
      env,
    );
    expect(createRes.status).toBe(201);
    const { exercise } = await createRes.json<{ exercise: { id: string } }>();

    const updateRes = await app.request(
      `/api/v1/exercises/${exercise.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "Custom Row Updated" }),
      },
      env,
    );
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json<{ exercise: { name: string } }>();
    expect(updated.exercise.name).toBe("Custom Row Updated");

    const delRes = await app.request(
      `/api/v1/exercises/${exercise.id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(delRes.status).toBe(200);
  });

  it("updates exercise with secondary muscles and instruction steps", async () => {
    const createRes = await app.request(
      "/api/v1/exercises",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: "Full Update Exercise",
          category: "back",
          body_part: "back",
          muscle_group_id: "mg_back",
          secondary_muscle_ids: ["mg_biceps"],
          instruction_steps: ["Step 1", "Step 2"],
        }),
      },
      env,
    );
    const { exercise } = await createRes.json<{ exercise: { id: string } }>();

    const updateRes = await app.request(
      `/api/v1/exercises/${exercise.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: "Fully Updated",
          category: "shoulders",
          body_part: "shoulders",
          equipment: "dumbbell",
          instructions: "Do the thing",
          instruction_steps: ["New Step 1"],
          muscle_group_id: "mg_shoulders",
          target: "deltoids",
          secondary_muscle_ids: ["mg_triceps"],
        }),
      },
      env,
    );
    expect(updateRes.status).toBe(200);
    const data = await updateRes.json<{ exercise: { name: string } }>();
    expect(data.exercise.name).toBe("Fully Updated");
  });

  it("updates exercise with only secondary_muscle_ids (no other patch fields)", async () => {
    const createRes = await app.request(
      "/api/v1/exercises",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: "Secondary Only Exercise",
          category: "chest",
          body_part: "chest",
          secondary_muscle_ids: ["mg_shoulders"],
        }),
      },
      env,
    );
    const { exercise } = await createRes.json<{ exercise: { id: string } }>();

    const updateRes = await app.request(
      `/api/v1/exercises/${exercise.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ secondary_muscle_ids: ["mg_triceps", "mg_biceps"] }),
      },
      env,
    );
    expect(updateRes.status).toBe(200);
    const data = await updateRes.json<{ exercise: { id: string } }>();
    expect(data.exercise.id).toBe(exercise.id);
  });

  it("updates exercise with empty secondary_muscle_ids array", async () => {
    const createRes = await app.request(
      "/api/v1/exercises",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: "Clear Secondary Exercise",
          category: "back",
          body_part: "back",
          secondary_muscle_ids: ["mg_biceps"],
        }),
      },
      env,
    );
    const { exercise } = await createRes.json<{ exercise: { id: string } }>();

    const updateRes = await app.request(
      `/api/v1/exercises/${exercise.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "Cleared", secondary_muscle_ids: [] }),
      },
      env,
    );
    expect(updateRes.status).toBe(200);
  });

  it("returns 400 when creating exercise without required fields", async () => {
    const res = await app.request(
      "/api/v1/exercises",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "Incomplete" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown exercise id", async () => {
    const res = await app.request(
      "/api/v1/exercises/nonexistent",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when deleting non-existent custom exercise", async () => {
    const res = await app.request(
      "/api/v1/exercises/custom_nonexistent",
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when updating non-existent custom exercise", async () => {
    const res = await app.request(
      "/api/v1/exercises/custom_nonexistent",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "Ghost" }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when updating another user's exercise", async () => {
    const { token: otherToken } = await registerUser("other@example.com", "password123");
    const createRes = await app.request(
      "/api/v1/exercises",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${otherToken}` },
        body: JSON.stringify({ name: "Other Exercise", category: "chest", body_part: "chest" }),
      },
      env,
    );
    const { exercise } = await createRes.json<{ exercise: { id: string } }>();

    const res = await app.request(
      `/api/v1/exercises/${exercise.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "Stolen" }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });
});
