import { describe, it, expect, vi, beforeEach } from "vitest";
import { authStore } from "../auth";

describe("Auth Store", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
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

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: "Logout successful" }),
      }),
    );

    await authStore.logout();

    expect(authStore.token).toBeNull();
    expect(authStore.user).toBeNull();
    expect(authStore.isAuthenticated.value).toBe(false);
    expect(localStorage.getItem("gymlogger_token")).toBeNull();
  });

  it("isAuthenticated transitions correctly through logout and re-login", async () => {
    authStore.setAuth("token-a", { id: "u1", email: "a@example.com" });
    expect(authStore.isAuthenticated.value).toBe(true);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: "Logout successful" }),
      }),
    );
    await authStore.logout();
    expect(authStore.isAuthenticated.value).toBe(false);

    authStore.setAuth("token-b", { id: "u2", email: "b@example.com" });
    expect(authStore.isAuthenticated.value).toBe(true);
    expect(authStore.token).toBe("token-b");
  });
});
