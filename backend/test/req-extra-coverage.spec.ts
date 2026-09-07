import { describe, expect, it, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:test";
import app from "../src/index";
import { session, user } from "../src/db/schema";

async function register(email: string): Promise<string> {
  const res = await app.request(
    "/api/v1/auth/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test User", email, password: "password123" }),
    },
    env,
  );
  const data = await res.json();
  return data.token;
}

async function startWorkout(token: string, title = "Test Workout"): Promise<string> {
  const res = await app.request(
    "/api/v1/workouts/start",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title }),
    },
    env,
  );
  const data = await res.json();
  return data.workout.id;
}

// ── middleware/auth.ts lines 30-31: session-table auth path ──────────────────

describe("Auth middleware: session-table fallback", () => {
  it("accepts a valid DB session token that is not a JWT", async () => {
    const token = await register("session-auth@example.com");
    const db = drizzle(env.DB);

    // Get the user id from the token by hitting any protected endpoint first
    const profileRes = await app.request(
      "/api/v1/users/profile",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    const { profile } = await profileRes.json();
    const userId = profile.id;

    const sessionToken = "opaque-session-token-12345";
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    await db
      .insert(session)
      .values({
        id: `sess_${crypto.randomUUID()}`,
        token: sessionToken,
        userId,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const res = await app.request(
      "/api/v1/users/profile",
      { headers: { Authorization: `Bearer ${sessionToken}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile.id).toBe(userId);
  });
});

// ── routes/users.ts line 36: GET /profile 404 ───────────────────────────────

describe("Users: profile 404 for user without profile row", () => {
  it("returns 404 when user profile row does not exist", async () => {
    const token = await register("noprofile@example.com");
    const db = drizzle(env.DB);

    // Get userId via profile (which exists after register), then delete the profile row
    const profileRes = await app.request(
      "/api/v1/users/profile",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    const { profile } = await profileRes.json();

    await db
      .delete((await import("../src/db/schema")).usersProfile)
      .where((await import("drizzle-orm")).eq((await import("../src/db/schema")).usersProfile.id, profile.id))
      .run();

    const res = await app.request(
      "/api/v1/users/profile",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });
});

// ── routes/users.ts line 86: PUT /profile 404 ───────────────────────────────

describe("Users: PUT profile 404 when profile row missing", () => {
  it("returns 404 on PUT /profile when profile row is deleted", async () => {
    const token = await register("noprofileput@example.com");
    const db = drizzle(env.DB);
    const { eq } = await import("drizzle-orm");
    const { usersProfile } = await import("../src/db/schema");

    const profileRes = await app.request(
      "/api/v1/users/profile",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    const { profile } = await profileRes.json();

    await db.delete(usersProfile).where(eq(usersProfile.id, profile.id)).run();

    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ location: "Berlin" }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });
});

// ── routes/users.ts lines 145-159: GET /settings when no settings row ────────

describe("Users: GET /settings auto-creates settings when row missing", () => {
  it("creates default settings when none exist", async () => {
    const token = await register("nosettings@example.com");
    const db = drizzle(env.DB);
    const { eq } = await import("drizzle-orm");
    const { userSettings } = await import("../src/db/schema");

    const profileRes = await app.request(
      "/api/v1/users/profile",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    const { profile } = await profileRes.json();

    await db.delete(userSettings).where(eq(userSettings.userId, profile.id)).run();

    const res = await app.request(
      "/api/v1/users/settings",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.settings.preferred_weight_unit).toBe("kg");
  });
});

// ── routes/workouts.ts line 376: set.weightUnit null fallback ────────────────
// ── routes/workouts.ts line 351: body null fallback on PUT set ───────────────

describe("Workouts: PUT set edge cases", () => {
  let token: string;

  beforeEach(async () => {
    token = await register(`putset-${crypto.randomUUID()}@example.com`);
  });

  it("updates set with partial body (uses existing values for omitted fields)", async () => {
    const workoutId = await startWorkout(token);

    const addExRes = await app.request(
      `/api/v1/workouts/${workoutId}/exercises`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise_id: "ex_bench_press", order_index: 0 }),
      },
      env,
    );
    const { workoutExercise } = await addExRes.json();

    const setRes = await app.request(
      `/api/v1/workouts/${workoutId}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workout_exercise_id: workoutExercise.id, weight: 80, reps: 8 }),
      },
      env,
    );
    const setData = await setRes.json();
    const setId = setData.set.id;

    // PUT with only rpe — weight/reps/set_type fall back to existing values
    const updateRes = await app.request(
      `/api/v1/workouts/${workoutId}/sets/${setId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rpe: 7 }),
      },
      env,
    );
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.set.weight).toBe(80);
    expect(updated.set.reps).toBe(8);
    expect(updated.set.rpe).toBe(7);
  });

  it("returns 404 when updating set from wrong workout", async () => {
    const workoutId = await startWorkout(token);
    const res = await app.request(
      `/api/v1/workouts/${workoutId}/sets/nonexistent-set`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weight: 100 }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });
});

// ── routes/workouts.ts line 454: finish workout without notes ────────────────

describe("Workouts: finish without notes body", () => {
  let token: string;

  beforeEach(async () => {
    token = await register(`finish-${crypto.randomUUID()}@example.com`);
  });

  it("finishes workout with no body (notes stays null)", async () => {
    const workoutId = await startWorkout(token);

    // no body at all → body defaults to {} → notes is null → no notes patch
    const res = await app.request(
      `/api/v1/workouts/${workoutId}/finish`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.workout.notes).toBeNull();
    expect(data.workout.end_time).toBeDefined();
  });
});

// ── routes/workouts.ts line 548: GET /:id with no exercise sets ─────────────

describe("Workouts: GET by id with exercises but no sets", () => {
  let token: string;

  beforeEach(async () => {
    token = await register(`getid-${crypto.randomUUID()}@example.com`);
  });

  it("returns exercises with empty sets array when no sets logged", async () => {
    const workoutId = await startWorkout(token);

    await app.request(
      `/api/v1/workouts/${workoutId}/exercises`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exercise_id: "ex_bench_press", order_index: 0 }),
      },
      env,
    );

    const res = await app.request(
      `/api/v1/workouts/${workoutId}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.workout.exercises[0].sets).toEqual([]);
  });
});

// ── analytics.ts lines 368-370: year-in-review with no data ─────────────────

describe("Analytics: year-in-review", () => {
  let token: string;

  beforeEach(async () => {
    token = await register(`yir-${crypto.randomUUID()}@example.com`);
  });

  it("returns zero totals for a year with no workouts", async () => {
    const res = await app.request(
      "/api/v1/analytics/year-in-review?year=2020",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.year).toBe(2020);
    expect(data.totalWorkouts).toBe(0);
    expect(data.totalVolume).toBe(0);
    expect(data.totalDurationSeconds).toBe(0);
  });

  it("returns data for a year with workouts", async () => {
    const workoutId = await startWorkout(token, "Year Review Workout");
    await app.request(
      `/api/v1/workouts/${workoutId}/finish`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      },
      env,
    );

    const year = new Date().getFullYear();
    const res = await app.request(
      `/api/v1/analytics/year-in-review?year=${year}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalWorkouts).toBeGreaterThanOrEqual(1);
  });
});

// ── analytics.ts lines 226-247: monthly-summary null-coalescing ─────────────

describe("Analytics: monthly-summary with no data", () => {
  let token: string;

  beforeEach(async () => {
    token = await register(`monthly-${crypto.randomUUID()}@example.com`);
  });

  it("returns zeroes for a month with no workouts", async () => {
    const res = await app.request(
      "/api/v1/analytics/monthly-report?year=2020&month=1",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalWorkouts).toBe(0);
    expect(data.totalVolume).toBe(0);
    expect(data.totalDurationSeconds).toBe(0);
  });
});

// ── routes/exercises.ts line 220: PUT exercise without instruction_steps ─────

describe("Exercises: PUT without instruction_steps", () => {
  let token: string;

  beforeEach(async () => {
    token = await register(`exput-${crypto.randomUUID()}@example.com`);
  });

  it("updates custom exercise without touching instruction_steps", async () => {
    const createRes = await app.request(
      "/api/v1/exercises",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: "My Exercise",
          category: "chest",
          body_part: "chest",
          instruction_steps: ["step 1", "step 2"],
        }),
      },
      env,
    );
    const { exercise } = await createRes.json();

    // PUT without instruction_steps — that branch must stay uncovered/skip
    const updateRes = await app.request(
      `/api/v1/exercises/${exercise.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "My Updated Exercise" }),
      },
      env,
    );
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.exercise.name).toBe("My Updated Exercise");
  });
});

// ── routes/auth.ts line 144: invalid JSON on login ───────────────────────────

describe("Auth: invalid JSON bodies", () => {
  it("returns 400 on login with invalid JSON", async () => {
    const res = await app.request(
      "/api/v1/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json{{{",
      },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON body");
  });
});
