import { describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import app from "../src/index";
import { registerUser } from "./helpers";

describe("Index", () => {
  it("returns 404 for unknown route", async () => {
    const { token } = await registerUser("notfound@example.com", "password123");
    const res = await app.request(
      "/api/v1/nonexistent-route-xyz",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(404);
    const data = await res.json<{ error: string }>();
    expect(data.error).toBe("Endpoint not found");
  });

  it("GET /health returns ok", async () => {
    const res = await app.request("/health", {}, env);
    expect(res.status).toBe(200);
    const data = await res.json<{ status: string }>();
    expect(data.status).toBe("ok");
  });

  it("onError passes HTTPException through with its original status (app instance)", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      { headers: { Authorization: "Bearer invalid_token_xyz" } },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("onError passes through HTTPException with its original status", async () => {
    const testApp = new Hono();
    testApp.get("/boom", () => {
      throw new HTTPException(403, { message: "Forbidden" });
    });
    testApp.onError((err, c) => {
      if (err instanceof HTTPException) return err.getResponse();
      return c.json({ error: "Internal Server Error" }, 500);
    });
    const res = await testApp.request("/boom");
    expect(res.status).toBe(403);
  });

  it("onError returns 500 for non-HTTPException errors", async () => {
    const testApp = new Hono();
    testApp.get("/boom", () => {
      throw new Error("unexpected failure");
    });
    testApp.onError((err, c) => {
      if (err instanceof HTTPException) return err.getResponse();
      return c.json({ error: "Internal Server Error" }, 500);
    });
    const res = await testApp.request("/boom");
    expect(res.status).toBe(500);
    const data = await res.json<{ error: string }>();
    expect(data.error).toBe("Internal Server Error");
  });
});
