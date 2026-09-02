import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("GymLogger Boilerplate API", () => {
  it("GET / returns API metadata", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      name: "GymLogger API",
      status: "ok",
      version: "0.1.0",
    });
  });

  it("GET /health returns healthy status", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "healthy" });
  });

  it("HEAD /health returns status 200 without body", async () => {
    const res = await app.request("/health", { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });
});
