import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
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
});
