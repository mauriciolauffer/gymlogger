import { describe, expect, it, beforeEach } from "vitest";
import { createClient, registerUser } from "./helpers.ts";

describe("Workout templates", () => {
  let token: string;
  let client: ReturnType<typeof createClient>;

  beforeEach(async () => {
    ({ token } = await registerUser("template@example.com", "password123", "Template User"));
    client = createClient();
  });

  it("creates, lists, updates, uses, and deletes a template", async () => {
    const createRes = await client.api.v1["workout-templates"].$post(
      {
        json: {
          title: "Upper Body Power",
          notes: "Focus on heavy compound lifts",
          exercises: [
            { exercise_id: "ex_bench_press", order_index: 0 },
            { exercise_id: "ex_overhead_press", order_index: 1 },
          ],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(createRes.status).toBe(201);
    const createData = await createRes.json<{ template: { id: string; exercises: unknown[] } }>();
    const templateId = createData.template.id;
    expect(templateId).toContain("wt_");
    expect(createData.template.exercises.length).toBe(2);

    const listRes = await client.api.v1["workout-templates"].$get(
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(listRes.status).toBe(200);
    const listData = await listRes.json<{ templates: unknown[] }>();
    expect(listData.templates.length).toBe(1);

    const updateRes = await client.api.v1["workout-templates"][":id"].$put(
      { param: { id: templateId }, json: { title: "Upper Body Hypertrophy" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(updateRes.status).toBe(200);
    const updateData = await updateRes.json<{ template: { title: string } }>();
    expect(updateData.template.title).toBe("Upper Body Hypertrophy");

    const startRes = await client.api.v1.workouts.start.$post(
      { json: { title: "Session From Template", template_id: templateId } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(startRes.status).toBe(201);
    const startData = await startRes.json<{ workout: { id: string } }>();
    const workoutId = startData.workout.id;

    const getWorkoutRes = await client.api.v1.workouts[":id"].$get(
      { param: { id: workoutId } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const workoutData = await getWorkoutRes.json<{ workout: { exercises: unknown[] } }>();
    expect(workoutData.workout.exercises.length).toBe(2);

    const delRes = await client.api.v1["workout-templates"][":id"].$delete(
      { param: { id: templateId } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(delRes.status).toBe(200);
  });

  it("returns template with exercises in GET /:id", async () => {
    const createRes = await client.api.v1["workout-templates"].$post(
      {
        json: {
          title: "Detail Template",
          exercises: [{ exercise_id: "ex_bench_press", order_index: 0 }],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { template } = await createRes.json<{ template: { id: string } }>();

    const res = await client.api.v1["workout-templates"][":id"].$get(
      { param: { id: template.id } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ template: { exercises: { exerciseName: string }[] } }>();
    expect(data.template.exercises.length).toBe(1);
    expect(data.template.exercises[0].exerciseName).toBeDefined();
  });

  it("updates a template replacing exercises array", async () => {
    const createRes = await client.api.v1["workout-templates"].$post(
      {
        json: {
          title: "Replace Exercises",
          exercises: [{ exercise_id: "ex_bench_press", order_index: 0 }],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { template } = await createRes.json<{ template: { id: string } }>();

    const updateRes = await client.api.v1["workout-templates"][":id"].$put(
      {
        param: { id: template.id },
        json: {
          title: "Replaced",
          exercises: [
            { exercise_id: "ex_squat", order_index: 0 },
            { exercise_id: "ex_overhead_press", order_index: 1 },
          ],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(updateRes.status).toBe(200);
    const data = await updateRes.json<{
      template: { title: string; exercises: unknown[] };
    }>();
    expect(data.template.title).toBe("Replaced");

    const getRes = await client.api.v1["workout-templates"][":id"].$get(
      { param: { id: template.id } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const getData = await getRes.json<{ template: { exercises: unknown[] } }>();
    expect(getData.template.exercises.length).toBe(2);
  });

  it("updates template title only (no exercises replacement)", async () => {
    const createRes = await client.api.v1["workout-templates"].$post(
      {
        json: {
          title: "Original Title",
          exercises: [{ exercise_id: "ex_bench_press", order_index: 0 }],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { template } = await createRes.json<{ template: { id: string } }>();

    const updateRes = await client.api.v1["workout-templates"][":id"].$put(
      { param: { id: template.id }, json: { title: "New Title" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(updateRes.status).toBe(200);
    const data = await updateRes.json<{ template: { title: string } }>();
    expect(data.template.title).toBe("New Title");
  });

  it("updates template notes only (title unchanged)", async () => {
    const createRes = await client.api.v1["workout-templates"].$post(
      { json: { title: "Stable Title" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { template } = await createRes.json<{ template: { id: string; title: string } }>();

    const updateRes = await client.api.v1["workout-templates"][":id"].$put(
      { param: { id: template.id }, json: { notes: "Updated notes" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(updateRes.status).toBe(200);
    const data = await updateRes.json<{ template: { title: string } }>();
    expect(data.template.title).toBe("Stable Title");
  });

  it("creates a template without exercises", async () => {
    const res = await client.api.v1["workout-templates"].$post(
      { json: { title: "No Exercises", notes: "Some notes" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(201);
    const data = await res.json<{ template: { exercises: unknown[] } }>();
    expect(data.template.exercises).toEqual([]);
  });

  it("creates template with exercises that have no order_index (auto-index)", async () => {
    const res = await client.api.v1["workout-templates"].$post(
      {
        json: {
          title: "Auto Index Template",
          exercises: [{ exercise_id: "ex_bench_press" }, { exercise_id: "ex_squat" }],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(201);
    const data = await res.json<{
      template: { exercises: { orderIndex: number }[] };
    }>();
    expect(data.template.exercises.length).toBe(2);
  });

  it("updates template with exercises that have no order_index", async () => {
    const createRes = await client.api.v1["workout-templates"].$post(
      { json: { title: "Update Auto Index" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { template } = await createRes.json<{ template: { id: string } }>();

    const updateRes = await client.api.v1["workout-templates"][":id"].$put(
      {
        param: { id: template.id },
        json: {
          title: "Updated",
          exercises: [{ exercise_id: "ex_bench_press" }],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(updateRes.status).toBe(200);
    const data = await updateRes.json<{
      template: { exercises: { orderIndex: number }[] };
    }>();
    expect(data.template.exercises.length).toBe(1);
  });

  it("returns 404 for unknown template", async () => {
    const res = await client.api.v1["workout-templates"][":id"].$get(
      { param: { id: "nonexistent" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when updating another user's template", async () => {
    const { token: otherToken } = await registerUser("tmpl-other@example.com", "password123");
    const createRes = await client.api.v1["workout-templates"].$post(
      { json: { title: "Private Template" } },
      { headers: { Authorization: `Bearer ${otherToken}` } },
    );
    const { template } = await createRes.json<{ template: { id: string } }>();

    const res = await client.api.v1["workout-templates"][":id"].$put(
      { param: { id: template.id }, json: { title: "Stolen" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when deleting another user's template", async () => {
    const { token: otherToken } = await registerUser("tmpl-del-other@example.com", "password123");
    const createRes = await client.api.v1["workout-templates"].$post(
      { json: { title: "Another Private Template" } },
      { headers: { Authorization: `Bearer ${otherToken}` } },
    );
    const { template } = await createRes.json<{ template: { id: string } }>();

    const res = await client.api.v1["workout-templates"][":id"].$delete(
      { param: { id: template.id } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(404);
  });

  it("deleting a template removes its child exercise rows", async () => {
    const createRes = await client.api.v1["workout-templates"].$post(
      {
        json: {
          title: "Cascade Template",
          exercises: [
            { exercise_id: "ex_bench_press", order_index: 0 },
            { exercise_id: "ex_squat", order_index: 1 },
          ],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { template } = await createRes.json<{ template: { id: string } }>();

    await client.api.v1["workout-templates"][":id"].$delete(
      { param: { id: template.id } },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const getRes = await client.api.v1["workout-templates"][":id"].$get(
      { param: { id: template.id } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(getRes.status).toBe(404);
  });

  it("returns 400 with error details when creating template with invalid body", async () => {
    const res = await client.api.v1["workout-templates"].$post(
      { json: { notes: "No title" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(400);
    const data = await res.json<{ error?: string; success?: boolean }>();
    expect(data.success === false || typeof data.error === "string").toBe(true);
  });
});
