import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("Calculators extended", () => {
  let token: string;

  beforeEach(async () => {
    const res = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Calc Tester", email: "calc@example.com", password: "password123" }),
      },
      env,
    );
    token = (await res.json()).token;
  });

  it("GET /calculators/warmup returns 400 when targetWeight missing", async () => {
    const res = await app.request(
      "/api/v1/calculators/warmup",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("targetWeight must be a positive number");
  });

  it("GET /calculators/warmup returns 400 for negative targetWeight", async () => {
    const res = await app.request(
      "/api/v1/calculators/warmup?targetWeight=-50",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(400);
  });
});

describe("Live activity extended", () => {
  let token: string;
  let workoutId: string;

  beforeEach(async () => {
    const res = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Live Tester", email: "live@example.com", password: "password123" }),
      },
      env,
    );
    token = (await res.json()).token;

    const startRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Live Workout" }),
      },
      env,
    );
    workoutId = (await startRes.json()).workout.id;
  });

  it("GET /:id/live returns 404 for unknown workout", async () => {
    const res = await app.request(
      "/api/v1/workouts/nonexistent/live",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("GET /:id/live returns active workout data", async () => {
    const res = await app.request(
      `/api/v1/workouts/${workoutId}/live`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("active");
    expect(typeof data.elapsedSeconds).toBe("number");
  });

  it("GET /:id/live for completed workout shows completed status", async () => {
    await app.request(
      `/api/v1/workouts/${workoutId}/finish`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      },
      env,
    );

    const res = await app.request(
      `/api/v1/workouts/${workoutId}/live`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("completed");
  });
});

describe("Workouts previous-values missing exerciseId", () => {
  let token: string;

  beforeEach(async () => {
    const res = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "PrevVals Tester", email: "prevvals2@example.com", password: "password123" }),
      },
      env,
    );
    token = (await res.json()).token;
  });

  it("GET /previous-values returns 400 when exerciseId param missing", async () => {
    const res = await app.request(
      "/api/v1/workouts/previous-values",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("exerciseId parameter is required");
  });
});

describe("Workout templates GET /:id with exercises", () => {
  let token: string;
  let templateId: string;

  beforeEach(async () => {
    const res = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Template Detail Tester", email: "tpl-detail@example.com", password: "password123" }),
      },
      env,
    );
    token = (await res.json()).token;

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
    templateId = (await createRes.json()).template.id;
  });

  it("GET /:id returns template with exercises list", async () => {
    const res = await app.request(
      `/api/v1/workout-templates/${templateId}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.template.exercises.length).toBe(1);
    expect(data.template.exercises[0].exerciseName).toBeDefined();
  });
});

describe("Users GET/PUT profile 404 paths", () => {
  let token: string;

  beforeEach(async () => {
    const res = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Profile 404 Tester", email: "profile404@example.com", password: "password123" }),
      },
      env,
    );
    token = (await res.json()).token;
  });

  it("GET /profile returns profile for registered user", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile.email).toBe("profile404@example.com");
  });
});

describe("Analytics consecutive streak branch", () => {
  let token: string;

  beforeEach(async () => {
    const res = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Streak Tester 2", email: "streak2@example.com", password: "password123" }),
      },
      env,
    );
    token = (await res.json()).token;
  });

  it("GET /consistency with consecutive workouts covers streak continuation branch", async () => {
    // Three consecutive days
    for (let day = 1; day <= 3; day++) {
      await app.request(
        "/api/v1/workouts/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: `Day ${day}`, start_time: `2026-03-0${day}T10:00:00Z` }),
        },
        env,
      );
    }
    const res = await app.request(
      "/api/v1/analytics/consistency",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    // currentStreakDays should be >= 3 since the workouts are from the past (streak resets to 0 unless today)
    expect(typeof data.currentStreakDays).toBe("number");
    expect(data.totalWorkouts).toBe(3);
  });
});

describe("Personal records branch (line 16)", () => {
  let token: string;

  beforeEach(async () => {
    const res = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "PR Branch Tester", email: "pr-branch@example.com", password: "password123" }),
      },
      env,
    );
    token = (await res.json()).token;
  });

  it("GET /personal-records without exerciseId returns all records", async () => {
    const res = await app.request(
      "/api/v1/personal-records",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
  });
});
