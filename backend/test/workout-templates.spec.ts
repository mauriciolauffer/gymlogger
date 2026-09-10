import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";
import { registerUser } from "./helpers";

describe("Workout templates", () => {
  let token: string;

  beforeEach(async () => {
    ({ token } = await registerUser("template@example.com", "password123", "Template User"));
  });

  it("creates, lists, updates, uses, and deletes a template", async () => {
    const createRes = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: "Upper Body Power",
          notes: "Focus on heavy compound lifts",
          exercises: [
            { exercise_id: "ex_bench_press", order_index: 0 },
            { exercise_id: "ex_overhead_press", order_index: 1 },
          ],
        }),
      },
      env,
    );
    expect(createRes.status).toBe(201);
    const createData = await createRes.json<{ template: { id: string; exercises: unknown[] } }>();
    const templateId = createData.template.id;
    expect(templateId).toContain("wt_");
    expect(createData.template.exercises.length).toBe(2);

    const listRes = await app.request(
      "/api/v1/workout-templates",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(listRes.status).toBe(200);
    const listData = await listRes.json<{ templates: unknown[] }>();
    expect(listData.templates.length).toBe(1);

    const updateRes = await app.request(
      `/api/v1/workout-templates/${templateId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Upper Body Hypertrophy" }),
      },
      env,
    );
    expect(updateRes.status).toBe(200);
    const updateData = await updateRes.json<{ template: { title: string } }>();
    expect(updateData.template.title).toBe("Upper Body Hypertrophy");

    const startRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Session From Template", template_id: templateId }),
      },
      env,
    );
    expect(startRes.status).toBe(201);
    const startData = await startRes.json<{ workout: { id: string } }>();
    const workoutId = startData.workout.id;

    const getWorkoutRes = await app.request(
      `/api/v1/workouts/${workoutId}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    const workoutData = await getWorkoutRes.json<{ workout: { exercises: unknown[] } }>();
    expect(workoutData.workout.exercises.length).toBe(2);

    const delRes = await app.request(
      `/api/v1/workout-templates/${templateId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(delRes.status).toBe(200);
  });

  it("returns 404 for unknown template", async () => {
    const res = await app.request(
      "/api/v1/workout-templates/nonexistent",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when creating without a title", async () => {
    const res = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: "No title" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("returns template with exercises in GET /:id", async () => {
    const createRes = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: "Detail Template",
          exercises: [{ exercise_id: "ex_bench_press", order_index: 0 }],
        }),
      },
      env,
    );
    const { template } = await createRes.json<{ template: { id: string } }>();

    const res = await app.request(
      `/api/v1/workout-templates/${template.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ template: { exercises: { exerciseName: string }[] } }>();
    expect(data.template.exercises.length).toBe(1);
    expect(data.template.exercises[0].exerciseName).toBeDefined();
  });
});
