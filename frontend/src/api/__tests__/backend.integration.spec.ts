import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = "http://localhost:8787/api/v1";

const testEmail = `integration_test_${Date.now()}@example.com`;
const testPassword = "testpassword123";
let authToken = "";

async function apiCall(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

describe("Auth — register and login", () => {
  it("registers a new user and returns token", async () => {
    const { status, data } = await apiCall("POST", "/auth/register", {
      name: "Integration Tester",
      email: testEmail,
      password: testPassword,
    });
    expect(status).toBe(201);
    expect(data.token).toBeTruthy();
    expect(data.user.email).toBe(testEmail);
    authToken = data.token;
  });

  it("logs in with the registered credentials", async () => {
    const { status, data } = await apiCall("POST", "/auth/login", {
      email: testEmail,
      password: testPassword,
    });
    expect(status).toBe(200);
    expect(data.token).toBeTruthy();
    authToken = data.token;
  });

  it("rejects login with wrong password", async () => {
    const { status, data } = await apiCall("POST", "/auth/login", {
      email: testEmail,
      password: "wrongpassword",
    });
    expect(status).toBe(401);
    expect(data.error).toBeTruthy();
  });
});

describe("Users — profile and settings", () => {
  beforeAll(async () => {
    if (!authToken) {
      const { data } = await apiCall("POST", "/auth/login", {
        email: testEmail,
        password: testPassword,
      });
      authToken = data.token;
    }
  });

  it("GET /users/profile returns profile", async () => {
    const { status, data } = await apiCall("GET", "/users/profile", undefined, authToken);
    expect(status).toBe(200);
    expect(data.profile).toBeTruthy();
    expect(data.profile.email).toBe(testEmail);
  });

  it("PUT /users/profile updates profile fields", async () => {
    const { status, data } = await apiCall(
      "PUT",
      "/users/profile",
      { name: "Updated Athlete", location: "Berlin", height: 180, height_unit: "cm" },
      authToken,
    );
    expect(status).toBe(200);
    expect(data.profile.name).toBe("Updated Athlete");
    expect(data.profile.location).toBe("Berlin");
    expect(data.profile.heightUnit).toBe("cm");
  });

  it("GET /users/settings returns settings with snake_case keys", async () => {
    const { status, data } = await apiCall("GET", "/users/settings", undefined, authToken);
    expect(status).toBe(200);
    expect(data.settings).toBeTruthy();
    expect(data.settings).toHaveProperty("preferred_weight_unit");
    expect(data.settings).toHaveProperty("preferred_length_unit");
    expect(data.settings).toHaveProperty("rest_timer_duration_seconds");
  });

  it("PUT /users/settings updates settings — weight unit lbs", async () => {
    const { status, data } = await apiCall(
      "PUT",
      "/users/settings",
      { preferred_weight_unit: "lbs", theme: "dark" },
      authToken,
    );
    expect(status).toBe(200);
    expect(data.settings.preferred_weight_unit).toBe("lbs");
    expect(data.settings.theme).toBe("dark");
  });
});

describe("Workouts — full lifecycle", () => {
  let workoutId = "";
  let workoutExerciseId = "";
  let setId = "";
  let exerciseId = "";

  beforeAll(async () => {
    if (!authToken) {
      const { data } = await apiCall("POST", "/auth/login", {
        email: testEmail,
        password: testPassword,
      });
      authToken = data.token;
    }
    const { data } = await apiCall("GET", "/exercises", undefined, authToken);
    exerciseId = data.exercises?.[0]?.id ?? "";
  });

  it("POST /workouts/start creates a new workout", async () => {
    const { status, data } = await apiCall(
      "POST",
      "/workouts/start",
      { title: "Integration Test Workout" },
      authToken,
    );
    expect(status).toBe(201);
    expect(data.workout.id).toBeTruthy();
    workoutId = data.workout.id;
  });

  it("POST /workouts/:id/exercises adds an exercise", async () => {
    if (!exerciseId) return;
    const { status, data } = await apiCall(
      "POST",
      `/workouts/${workoutId}/exercises`,
      { exercise_id: exerciseId },
      authToken,
    );
    expect(status).toBe(201);
    expect(data.workoutExercise.id).toBeTruthy();
    workoutExerciseId = data.workoutExercise.id;
  });

  it("POST /workouts/:id/sets logs a set", async () => {
    if (!workoutExerciseId) return;
    const { status, data } = await apiCall(
      "POST",
      `/workouts/${workoutId}/sets`,
      { workout_exercise_id: workoutExerciseId, weight: 80, reps: 8, set_type: "normal" },
      authToken,
    );
    expect(status).toBe(201);
    expect(data.set.id).toBeTruthy();
    expect(data.set.weight).toBe(80);
    setId = data.set.id;
  });

  it("PUT /workouts/:id/sets/:setId updates a set", async () => {
    if (!setId) return;
    const { status, data } = await apiCall(
      "PUT",
      `/workouts/${workoutId}/sets/${setId}`,
      { weight: 90, reps: 6 },
      authToken,
    );
    expect(status).toBe(200);
    expect(data.set.weight).toBe(90);
  });

  it("DELETE /workouts/:id/sets/:setId deletes a set", async () => {
    if (!setId) return;
    const { status } = await apiCall(
      "DELETE",
      `/workouts/${workoutId}/sets/${setId}`,
      undefined,
      authToken,
    );
    expect(status).toBe(200);
  });

  it("PUT /workouts/:id/finish completes the workout", async () => {
    const { status, data } = await apiCall(
      "PUT",
      `/workouts/${workoutId}/finish`,
      { notes: "Integration test session" },
      authToken,
    );
    expect(status).toBe(200);
    expect(data.workout.end_time).toBeTruthy();
  });

  it("GET /workouts returns workout list", async () => {
    const { status, data } = await apiCall("GET", "/workouts", undefined, authToken);
    expect(status).toBe(200);
    expect(Array.isArray(data.workouts)).toBe(true);
    expect(data.workouts.some((w: any) => w.id === workoutId)).toBe(true);
  });

  it("GET /workouts/:id returns workout details", async () => {
    const { status, data } = await apiCall("GET", `/workouts/${workoutId}`, undefined, authToken);
    expect(status).toBe(200);
    expect(data.workout.id).toBe(workoutId);
    expect(Array.isArray(data.workout.exercises)).toBe(true);
  });

  it("DELETE /workouts/:id removes workout", async () => {
    const { status } = await apiCall("DELETE", `/workouts/${workoutId}`, undefined, authToken);
    expect(status).toBe(200);
  });
});

describe("Body Measurements", () => {
  let measurementId = "";

  beforeAll(async () => {
    if (!authToken) {
      const { data } = await apiCall("POST", "/auth/login", {
        email: testEmail,
        password: testPassword,
      });
      authToken = data.token;
    }
  });

  it("POST /body-measurements records a measurement with length_unit", async () => {
    const { status, data } = await apiCall(
      "POST",
      "/body-measurements",
      {
        weight: 78.5,
        weight_unit: "kg",
        body_fat_pct: 15.0,
        chest: 100,
        waist: 82,
        length_unit: "cm",
      },
      authToken,
    );
    expect(status).toBe(201);
    expect(data.measurement.id).toBeTruthy();
    measurementId = data.measurement.id;
  });

  it("GET /body-measurements returns measurements with length_unit and weight_unit", async () => {
    const { status, data } = await apiCall("GET", "/body-measurements", undefined, authToken);
    expect(status).toBe(200);
    expect(Array.isArray(data.measurements)).toBe(true);
    expect(data.measurements.length).toBeGreaterThan(0);
    const m = data.measurements[0];
    expect(m).toHaveProperty("weight_unit");
    expect(m).toHaveProperty("length_unit");
  });

  it("DELETE /body-measurements/:id deletes measurement", async () => {
    if (!measurementId) return;
    const { status } = await apiCall(
      "DELETE",
      `/body-measurements/${measurementId}`,
      undefined,
      authToken,
    );
    expect(status).toBe(200);
  });
});

describe("Analytics", () => {
  beforeAll(async () => {
    if (!authToken) {
      const { data } = await apiCall("POST", "/auth/login", {
        email: testEmail,
        password: testPassword,
      });
      authToken = data.token;
    }
  });

  it("GET /analytics/monthly-report returns report shape", async () => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const { status, data } = await apiCall(
      "GET",
      `/analytics/monthly-report?year=${year}&month=${month}`,
      undefined,
      authToken,
    );
    expect(status).toBe(200);
    expect(data).toHaveProperty("totalWorkouts");
    expect(data).toHaveProperty("totalVolume");
    expect(data).toHaveProperty("muscleDistribution");
  });

  it("GET /analytics/consistency returns streak data", async () => {
    const { status, data } = await apiCall("GET", "/analytics/consistency", undefined, authToken);
    expect(status).toBe(200);
    expect(data).toHaveProperty("currentStreak");
  });
});
