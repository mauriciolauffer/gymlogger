import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("Final missing branch coverage", () => {
  let token: string;
  let customExerciseId: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Final Branch Tester",
          email: "final-branch@example.com",
          password: "password123",
        }),
      },
      env,
    );
    token = (await regRes.json()).token;

    const createRes = await app.request(
      "/api/v1/exercises",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: "Branch Test Exercise",
          category: "back",
          body_part: "back",
        }),
      },
      env,
    );
    customExerciseId = (await createRes.json()).exercise.id;
  });

  it("PUT /exercises/:id with invalid JSON body returns 400", async () => {
    const res = await app.request(
      `/api/v1/exercises/${customExerciseId}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: "not json",
      },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON body");
  });
});
