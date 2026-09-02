import { describe, it, expect, vi, beforeEach } from "vitest";
import { authStore } from "../auth";

describe("Auth Store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sets auth token and user", () => {
    authStore.setAuth("token123", { id: "u1", email: "test@example.com", name: "Tester" });

    expect(authStore.token).toBe("token123");
    expect(authStore.user).toEqual({ id: "u1", email: "test@example.com", name: "Tester" });
    expect(authStore.isAuthenticated.value).toBe(true);
    expect(localStorage.getItem("gymlogger_token")).toBe("token123");
  });

  it("logs out user and clears localStorage", async () => {
    authStore.setAuth("token123", { id: "u1", email: "test@example.com" });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Logout successful" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await authStore.logout();

    expect(authStore.token).toBeNull();
    expect(authStore.user).toBeNull();
    expect(authStore.isAuthenticated.value).toBe(false);
    expect(localStorage.getItem("gymlogger_token")).toBeNull();
  });
});
