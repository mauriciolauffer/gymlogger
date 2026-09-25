import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import { createClient, registerUser } from "./helpers.ts";
import { userSettings } from "../src/db/schema.ts";

describe("Live activity", () => {
  let token: string;
  let workoutId: string;
  let client: ReturnType<typeof createClient>;

  beforeEach(async () => {
    ({ token } = await registerUser("live@example.com", "password123", "Live User"));
    client = createClient();
    const startRes = await client.api.v1.workouts.start.$post(
      { json: { title: "Live Workout" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    ({
      workout: { id: workoutId },
    } = await startRes.json<{ workout: { id: string } }>());
  });

  it("returns active status and elapsed seconds for an in-progress workout", async () => {
    const res = await client.api.v1.workouts[":id"].live.$get(
      { param: { id: workoutId } },
      { headers: { Authorization: `Bearer ${token}` } },
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
    await client.api.v1.workouts[":id"].finish.$put(
      { param: { id: workoutId }, json: {} },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const res = await client.api.v1.workouts[":id"].live.$get(
      { param: { id: workoutId } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ status: string }>();
    expect(data.status).toBe("completed");
  });

  it("GET /:id/live uses default rest timer when no settings exist", async () => {
    const { token: freshToken, userId } = await registerUser(
      "live-no-settings@example.com",
      "password123",
      "Live No Settings",
    );
    const wRes = await client.api.v1.workouts.start.$post(
      { json: { title: "No Settings Workout" } },
      { headers: { Authorization: `Bearer ${freshToken}` } },
    );
    const { workout } = await wRes.json<{ workout: { id: string } }>();
    const db = drizzle(env.DB);
    await db.delete(userSettings).where(eq(userSettings.userId, userId)).run();

    const res = await client.api.v1.workouts[":id"].live.$get(
      { param: { id: workout.id } },
      { headers: { Authorization: `Bearer ${freshToken}` } },
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ restTimerDurationSeconds: number }>();
    expect(data.restTimerDurationSeconds).toBe(90);
  });

  it("returns 404 for an unknown workout", async () => {
    const res = await client.api.v1.workouts[":id"].live.$get(
      { param: { id: "nonexistent" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(404);
  });
});
