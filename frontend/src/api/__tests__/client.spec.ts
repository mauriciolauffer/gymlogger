import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, apiFetch } from "../client";

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

    const res = await api.get("/api/v1/test");

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/test", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
    });
    expect(res).toEqual({ status: "ok" });
  });

  it("throws error with message on non-ok response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Bad Request" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(api.post("/api/v1/test", { a: 1 })).rejects.toThrow("Bad Request");
  });

  it("supports post, put, delete methods", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await api.post("/api/v1/items", { name: "item1" });
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/items", expect.objectContaining({ method: "POST" }));

    await api.put("/api/v1/items/1", { name: "updated" });
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/items/1", expect.objectContaining({ method: "PUT" }));

    await api.delete("/api/v1/items/1");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/items/1", expect.objectContaining({ method: "DELETE" }));
  });
});
