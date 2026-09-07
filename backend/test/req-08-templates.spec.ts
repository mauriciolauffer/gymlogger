import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("REQ-08: Workout Templates", () => {
  let token: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Template User",
          email: "template@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;
  });

  it("creates, fetches, updates, and deletes a workout template", async () => {
    const createRes = await app.request(
      "/api/v1/workout-templates",
      {
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
      },
      env,
    );

    expect(createRes.status).toBe(201);
    const createData = await createRes.json();
    const templateId = createData.template.id;
    expect(templateId).toContain("wt_");
    expect(createData.template.exercises.length).toBe(2);

    const listRes = await app.request(
      "/api/v1/workout-templates",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.templates.length).toBe(1);

    const updateRes = await app.request(
      `/api/v1/workout-templates/${templateId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "Upper Body Hypertrophy" }),
      },
      env,
    );
    expect(updateRes.status).toBe(200);
    const updateData = await updateRes.json();
    expect(updateData.template.title).toBe("Upper Body Hypertrophy");

    const startRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "Session From Template", template_id: templateId }),
      },
      env,
    );
    expect(startRes.status).toBe(201);
    const startData = await startRes.json();
    const workoutId = startData.workout.id;

    const getWorkoutRes = await app.request(
      `/api/v1/workouts/${workoutId}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    const workoutData = await getWorkoutRes.json();
    expect(workoutData.workout.exercises.length).toBe(2);

    const delRes = await app.request(
      `/api/v1/workout-templates/${templateId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );
    expect(delRes.status).toBe(200);
  });
});
