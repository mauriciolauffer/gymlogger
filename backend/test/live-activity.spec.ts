import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";
import { registerUser } from "./helpers";

describe("Live activity", () => {
  let token: string;
  let workoutId: string;

  beforeEach(async () => {
    ({ token } = await registerUser("live@example.com", "password123", "Live User"));
    const startRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Live Workout" }),
      },
      env,
    );
    ({
      workout: { id: workoutId },
    } = await startRes.json<{ workout: { id: string } }>());
  });

  it("returns active status and elapsed seconds for an in-progress workout", async () => {
    const res = await app.request(
      `/api/v1/workouts/${workoutId}/live`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{
      status: string;
      elapsedSeconds: number;
      restTimerDurationSeconds: number;
    }>();
    expect(data.status).toBe("active");
    expect(typeof data.elapsedSeconds).toBe("number");
    expect(typeof data.restTimerDurationSeconds).toBe("number");
  });

  it("returns completed status for a finished workout", async () => {
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
    const data = await res.json<{ status: string }>();
    expect(data.status).toBe("completed");
  });

  it("GET /:id/live uses default rest timer when no settings exist", async () => {
    const { token: freshToken } = await registerUser(
      "live-no-settings@example.com",
      "password123",
      "Live No Settings",
    );
    const wRes = await app.request(
      "/api/v1/workouts/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${freshToken}` },
        body: JSON.stringify({ title: "No Settings Workout" }),
      },
      env,
    );
    const { workout } = await wRes.json<{ workout: { id: string } }>();

    const res = await app.request(
      `/api/v1/workouts/${workout.id}/live`,
      { headers: { Authorization: `Bearer ${freshToken}` } },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ restTimerDurationSeconds: number }>();
    expect(data.restTimerDurationSeconds).toBe(90);
  });

  it("returns 404 for an unknown workout", async () => {
    const res = await app.request(
      "/api/v1/workouts/nonexistent/live",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
  });
});
