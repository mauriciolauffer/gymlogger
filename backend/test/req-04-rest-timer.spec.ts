import { describe, expect, it, beforeEach } from "vitest";
import app from "../src/index";
import { createMockD1 } from "../src/db/d1-mock";

describe("REQ-04: Automatic Rest Timer & Warmup Calculator", () => {
  let db: D1Database;
  let token: string;

  beforeEach(async () => {
    db = createMockD1();
    const regRes = await app.request(
      new Request("http://localhost/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Rest Timer User",
          email: "rest@example.com",
          password: "password123",
        }),
      }),
      {},
      { DB: db },
    );
    const data = await regRes.json();
    token = data.token;
  });

  it("provides live activity status and rest timer duration based on user settings", async () => {
    // Start workout
    const startRes = await app.request(
      new Request("http://localhost/api/v1/workouts/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "Leg Day" }),
      }),
      {},
      { DB: db },
    );
    const { workout } = await startRes.json();

    // Query live activity
    const liveRes = await app.request(
      new Request(`http://localhost/api/v1/workouts/${workout.id}/live`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
    );

    expect(liveRes.status).toBe(200);
    const liveData = await liveRes.json();
    expect(liveData.workoutId).toBe(workout.id);
    expect(liveData.status).toBe("active");
    expect(liveData.restTimerDurationSeconds).toBe(90);
  });

  it("calculates warm-up sets accurately for a target working weight", async () => {
    const calcRes = await app.request(
      new Request("http://localhost/api/v1/calculators/warmup?targetWeight=100", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      {},
      { DB: db },
    );

    expect(calcRes.status).toBe(200);
    const data = await calcRes.json();
    expect(data.targetWeight).toBe(100);
    expect(data.warmUpSets.length).toBe(3);
    expect(data.warmUpSets[0].weight).toBe(40); // 40% of 100
    expect(data.warmUpSets[1].weight).toBe(60); // 60% of 100
    expect(data.warmUpSets[2].weight).toBe(80); // 80% of 100
  });
});
