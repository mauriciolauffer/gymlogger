import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";
import { registerUser } from "./helpers";

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
