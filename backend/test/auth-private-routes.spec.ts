import { describe, expect, it } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("Private routes deny unauthenticated access", () => {
  it("GET /api/v1/muscle-groups → 401", async () => {
    const res = await app.request("/api/v1/muscle-groups", {}, env);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/exercises → 401", async () => {
    const res = await app.request("/api/v1/exercises", {}, env);
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/exercises → 401", async () => {
    const res = await app.request("/api/v1/exercises", { method: "POST" }, env);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/exercises/:id → 401", async () => {
    const res = await app.request("/api/v1/exercises/any-id", {}, env);
    expect(res.status).toBe(401);
  });

  it("PUT /api/v1/exercises/:id → 401", async () => {
    const res = await app.request("/api/v1/exercises/any-id", { method: "PUT" }, env);
    expect(res.status).toBe(401);
  });

  it("DELETE /api/v1/exercises/:id → 401", async () => {
    const res = await app.request("/api/v1/exercises/any-id", { method: "DELETE" }, env);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/users/profile → 401", async () => {
    const res = await app.request("/api/v1/users/profile", {}, env);
    expect(res.status).toBe(401);
  });

  it("PUT /api/v1/users/profile → 401", async () => {
    const res = await app.request("/api/v1/users/profile", { method: "PUT" }, env);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/users/settings → 401", async () => {
    const res = await app.request("/api/v1/users/settings", {}, env);
    expect(res.status).toBe(401);
  });

  it("PUT /api/v1/users/settings → 401", async () => {
    const res = await app.request("/api/v1/users/settings", { method: "PUT" }, env);
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/workouts/start → 401", async () => {
    const res = await app.request("/api/v1/workouts/start", { method: "POST" }, env);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/workouts → 401", async () => {
    const res = await app.request("/api/v1/workouts", {}, env);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/workouts/previous-values → 401", async () => {
    const res = await app.request("/api/v1/workouts/previous-values?exerciseId=x", {}, env);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/workouts/:id/live → 401", async () => {
    const res = await app.request("/api/v1/workouts/any-id/live", {}, env);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/workout-templates → 401", async () => {
    const res = await app.request("/api/v1/workout-templates", {}, env);
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/workout-templates → 401", async () => {
    const res = await app.request("/api/v1/workout-templates", { method: "POST" }, env);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/personal-records → 401", async () => {
    const res = await app.request("/api/v1/personal-records", {}, env);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/calculators/warmup → 401", async () => {
    const res = await app.request("/api/v1/calculators/warmup?targetWeight=100", {}, env);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/analytics/muscle-groups → 401", async () => {
    const res = await app.request("/api/v1/analytics/muscle-groups", {}, env);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/analytics/volume → 401", async () => {
    const res = await app.request("/api/v1/analytics/volume", {}, env);
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/body-measurements → 401", async () => {
    const res = await app.request("/api/v1/body-measurements", {}, env);
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/body-measurements → 401", async () => {
    const res = await app.request("/api/v1/body-measurements", { method: "POST" }, env);
    expect(res.status).toBe(401);
  });
});
