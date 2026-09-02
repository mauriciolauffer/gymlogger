import { describe, expect, it, beforeEach } from "vitest";
import app from "../src/index";
import { createMockD1 } from "../src/db/d1-mock";

describe("REQ-08: Workout Templates", () => {
  let db: D1Database;
  let token: string;

  beforeEach(async () => {
    db = createMockD1();
    const regRes = await app.request(
      new Request("http://localhost/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Template User",
          email: "template@example.com",
          password: "password123",
        }),
      }),
      {},
      { DB: db },
    );
    const data = await regRes.json();
    token = data.token;
  });

  it("creates, fetches, updates, and deletes a workout template", async () => {
    // Create template
    const createRes = await app.request(
      new Request("http://localhost/api/v1/workout-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: "Upper Body Power",
          notes: "Focus on heavy compound lifts",
          exercises: [
            { exercise_id: "ex_bench_press", order_index: 0 },
            { exercise_id: "ex_overhead_press", order_index: 1 },
          ],
        }),
      }),
      {},
      { DB: db },
    );

    expect(createRes.status).toBe(201);
    const createData = await createRes.json();
    const templateId = createData.template.id;
    expect(templateId).toContain("wt_");
    expect(createData.template.exercises.length).toBe(2);

    // List templates
    const listRes = await app.request(
      new Request("http://localhost/api/v1/workout-templates", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
    );
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.templates.length).toBe(1);

    // Update template
    const updateRes = await app.request(
      new Request(`http://localhost/api/v1/workout-templates/${templateId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "Upper Body Hypertrophy" }),
      }),
      {},
      { DB: db },
    );
    expect(updateRes.status).toBe(200);
    const updateData = await updateRes.json();
    expect(updateData.template.title).toBe("Upper Body Hypertrophy");

    // Start workout session from template
    const startRes = await app.request(
      new Request("http://localhost/api/v1/workouts/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "Session From Template", template_id: templateId }),
      }),
      {},
      { DB: db },
    );
    expect(startRes.status).toBe(201);
    const startData = await startRes.json();
    const workoutId = startData.workout.id;

    // Check pre-added exercises in workout
    const getWorkoutRes = await app.request(
      new Request(`http://localhost/api/v1/workouts/${workoutId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
    );
    const workoutData = await getWorkoutRes.json();
    expect(workoutData.workout.exercises.length).toBe(2);

    // Delete template (does not affect past workout session)
    const delRes = await app.request(
      new Request(`http://localhost/api/v1/workout-templates/${templateId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
    );
    expect(delRes.status).toBe(200);
  });
});
