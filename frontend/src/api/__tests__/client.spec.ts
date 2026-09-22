import { describe, it, expect, vi, beforeEach } from "vitest";
import { client } from "../client";

describe("API Client", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("adds Authorization header when token exists in localStorage", async () => {
    localStorage.setItem("gymlogger_token", "test-token");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await client.api.v1.workouts.$get();

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = opts.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("omits Authorization header when no token in localStorage", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    await client.api.v1.workouts.$get();

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = opts.headers as Headers;
    expect(headers.get("Authorization")).toBeNull();
  });

  it("sends the token set after client creation (headers are evaluated lazily)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    // No token on first call
    await client.api.v1.workouts.$get();
    const [, firstOpts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((firstOpts.headers as Headers).get("Authorization")).toBeNull();

    // Token set, second call should include it
    localStorage.setItem("gymlogger_token", "new-token");
    await client.api.v1.workouts.$get();
    const [, secondOpts] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect((secondOpts.headers as Headers).get("Authorization")).toBe("Bearer new-token");
  });
});
