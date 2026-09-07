import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("Workout Templates extended coverage", () => {
  let token: string;
  let templateId: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Template Tester",
          email: "templates-ext@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;

    const createRes = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: "Push Day",
          notes: "Chest and shoulders",
          exercises: [
            { exercise_id: "ex_bench_press", order_index: 0 },
            { exercise_id: "ex_overhead_press", order_index: 1 },
          ],
        }),
      },
      env,
    );
    const createData = await createRes.json();
    templateId = createData.template.id;
  });

  it("PUT /:id updates template title and exercises", async () => {
    const res = await app.request(
      `/api/v1/workout-templates/${templateId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: "Updated Push Day",
          notes: "Updated notes",
          exercises: [{ exercise_id: "ex_bench_press", order_index: 0 }],
        }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.template.title).toBe("Updated Push Day");
    expect(data.template.exercises.length).toBe(1);
  });

  it("PUT /:id updates without exercises array", async () => {
    const res = await app.request(
      `/api/v1/workout-templates/${templateId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Renamed" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.template.title).toBe("Renamed");
  });

  it("PUT /:id returns 404 for unknown template", async () => {
    const res = await app.request(
      "/api/v1/workout-templates/nonexistent",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Nope" }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("PUT /:id returns 400 for invalid JSON body", async () => {
    const res = await app.request(
      `/api/v1/workout-templates/${templateId}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: "not json",
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("DELETE /:id deletes a template", async () => {
    const res = await app.request(
      `/api/v1/workout-templates/${templateId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe("Workout template deleted");
  });

  it("DELETE /:id returns 404 for unknown template", async () => {
    const res = await app.request(
      "/api/v1/workout-templates/nonexistent",
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("POST / returns 400 when title missing", async () => {
    const res = await app.request(
      "/api/v1/workout-templates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: "no title" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("GET /:id returns 404 for unknown template", async () => {
    const res = await app.request(
      "/api/v1/workout-templates/nonexistent",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });
});
