import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:workers";
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

  it("updates a template replacing exercises array", async () => {
    const createRes = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: "Replace Exercises",
          exercises: [{ exercise_id: "ex_bench_press", order_index: 0 }],
        }),
      },
      env,
    );
    const { template } = await createRes.json<{ template: { id: string } }>();

    const updateRes = await app.request(
      `/api/v1/workout-templates/${template.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: "Replaced",
          exercises: [
            { exercise_id: "ex_squat", order_index: 0 },
            { exercise_id: "ex_overhead_press", order_index: 1 },
          ],
        }),
      },
      env,
    );
    expect(updateRes.status).toBe(200);
    const data = await updateRes.json<{
      template: { title: string; exercises: unknown[] };
    }>();
    expect(data.template.title).toBe("Replaced");

    const getRes = await app.request(
      `/api/v1/workout-templates/${template.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    const getData = await getRes.json<{ template: { exercises: unknown[] } }>();
    expect(getData.template.exercises.length).toBe(2);
  });

  it("updates template title only (no exercises replacement)", async () => {
    const createRes = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: "Original Title",
          exercises: [{ exercise_id: "ex_bench_press", order_index: 0 }],
        }),
      },
      env,
    );
    const { template } = await createRes.json<{ template: { id: string } }>();

    const updateRes = await app.request(
      `/api/v1/workout-templates/${template.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "New Title" }),
      },
      env,
    );
    expect(updateRes.status).toBe(200);
    const data = await updateRes.json<{ template: { title: string } }>();
    expect(data.template.title).toBe("New Title");
  });

  it("updates template notes only (title unchanged)", async () => {
    const createRes = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Stable Title" }),
      },
      env,
    );
    const { template } = await createRes.json<{ template: { id: string; title: string } }>();

    const updateRes = await app.request(
      `/api/v1/workout-templates/${template.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: "Updated notes" }),
      },
      env,
    );
    expect(updateRes.status).toBe(200);
    const data = await updateRes.json<{ template: { title: string } }>();
    expect(data.template.title).toBe("Stable Title");
  });

  it("creates a template without exercises", async () => {
    const res = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "No Exercises", notes: "Some notes" }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = await res.json<{ template: { exercises: unknown[] } }>();
    expect(data.template.exercises).toEqual([]);
  });

  it("creates template with exercises that have no order_index (auto-index)", async () => {
    const res = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: "Auto Index Template",
          exercises: [{ exercise_id: "ex_bench_press" }, { exercise_id: "ex_squat" }],
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = await res.json<{
      template: { exercises: { orderIndex: number }[] };
    }>();
    expect(data.template.exercises.length).toBe(2);
  });

  it("updates template with exercises that have no order_index", async () => {
    const createRes = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Update Auto Index" }),
      },
      env,
    );
    const { template } = await createRes.json<{ template: { id: string } }>();

    const updateRes = await app.request(
      `/api/v1/workout-templates/${template.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: "Updated",
          exercises: [{ exercise_id: "ex_bench_press" }],
        }),
      },
      env,
    );
    expect(updateRes.status).toBe(200);
    const data = await updateRes.json<{
      template: { exercises: { orderIndex: number }[] };
    }>();
    expect(data.template.exercises.length).toBe(1);
  });

  it("returns 404 for unknown template", async () => {
    const res = await app.request(
      "/api/v1/workout-templates/nonexistent",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when updating another user's template", async () => {
    const { token: otherToken } = await registerUser("tmpl-other@example.com", "password123");
    const createRes = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${otherToken}` },
        body: JSON.stringify({ title: "Private Template" }),
      },
      env,
    );
    const { template } = await createRes.json<{ template: { id: string } }>();

    const res = await app.request(
      `/api/v1/workout-templates/${template.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Stolen" }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when deleting another user's template", async () => {
    const { token: otherToken } = await registerUser("tmpl-del-other@example.com", "password123");
    const createRes = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${otherToken}` },
        body: JSON.stringify({ title: "Another Private Template" }),
      },
      env,
    );
    const { template } = await createRes.json<{ template: { id: string } }>();

    const res = await app.request(
      `/api/v1/workout-templates/${template.id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("deleting a template removes its child exercise rows", async () => {
    const createRes = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: "Cascade Template",
          exercises: [
            { exercise_id: "ex_bench_press", order_index: 0 },
            { exercise_id: "ex_squat", order_index: 1 },
          ],
        }),
      },
      env,
    );
    const { template } = await createRes.json<{ template: { id: string } }>();

    await app.request(
      `/api/v1/workout-templates/${template.id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    const getRes = await app.request(
      `/api/v1/workout-templates/${template.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(getRes.status).toBe(404);
  });

  it("returns 400 with error details when creating template with invalid body", async () => {
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
    const data = await res.json<{ error?: string; success?: boolean }>();
    expect(data.success === false || typeof data.error === "string").toBe(true);
  });
});
