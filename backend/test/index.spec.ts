import { describe, expect, it } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("GymLogger API", () => {
  it("GET /health returns ok status", async () => {
    const res = await app.request("/health", {}, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });

  it("HEAD /health returns status 200 without body", async () => {
    const res = await app.request("/health", { method: "HEAD" }, env);
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("GET unknown private route returns 401 without auth", async () => {
    const res = await app.request("/not-a-real-public-route", {}, env);
    expect(res.status).toBe(401);
  });
});
