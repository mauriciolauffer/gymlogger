import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("Users extended coverage", () => {
  let token: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Users Tester",
          email: "users-ext@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;
  });

  // PUT /profile validation errors
  it("PUT /profile returns 400 for invalid sex", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sex: "alien" }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid sex value");
  });

  it("PUT /profile returns 400 for invalid height (non-number)", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ height: "tall" }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Height must be a positive number");
  });

  it("PUT /profile returns 400 for height <= 0", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ height: -5 }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Height must be a positive number");
  });

  it("PUT /profile returns 400 for invalid height_unit", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ height_unit: "furlongs" }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid height unit");
  });

  it("PUT /profile returns 400 for invalid JSON body", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: "not json",
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("PUT /profile accepts null sex and null height (clears values)", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sex: null, height: null }),
      },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("PUT /profile updates name", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "New Name" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile.name).toBe("New Name");
  });

  // PUT /settings validation errors
  it("PUT /settings returns 400 for invalid theme", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme: "rainbow" }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid theme");
  });

  it("PUT /settings returns 400 for invalid weight unit", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferred_weight_unit: "stone" }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid weight unit");
  });

  it("PUT /settings returns 400 for invalid length unit", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferred_length_unit: "miles" }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid length unit");
  });

  it("PUT /settings returns 400 for non-positive rest timer", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rest_timer_duration_seconds: -30 }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Rest timer duration must be a positive integer");
  });

  it("PUT /settings returns 400 for invalid JSON body", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: "not json",
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("PUT /settings accepts null theme (clears to default)", async () => {
    const res = await app.request(
      "/api/v1/users/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme: null }),
      },
      env,
    );
    expect(res.status).toBe(200);
  });
});

describe("Auth invalid JSON paths", () => {
  it("POST /auth/register returns 400 for invalid JSON", async () => {
    const res = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON body");
  });

  it("POST /auth/login returns 400 for invalid JSON", async () => {
    const res = await app.request(
      "/api/v1/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON body");
  });

  it("POST /auth/login returns 400 when email/password missing", async () => {
    const res = await app.request(
      "/api/v1/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "only@email.com" }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Email and password are required");
  });
});
