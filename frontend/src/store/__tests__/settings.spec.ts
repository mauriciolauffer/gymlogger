import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Settings Store", () => {
  let settingsStore: (typeof import("../settings"))["settingsStore"];

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();
    ({ settingsStore } = await import("../settings"));
  });

  it("fetches settings from API and updates store state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          settings: {
            theme: "D",
            preferred_weight_unit: "lbs",
            preferred_length_unit: "in",
            language: "en",
            rest_timer_duration_seconds: 120,
            notifications_enabled: true,
          },
        }),
      }),
    );

    await settingsStore.fetchSettings();

    expect(settingsStore.settings.theme).toBe("D");
    expect(settingsStore.settings.preferred_weight_unit).toBe("lbs");
    expect(settingsStore.settings.rest_timer_duration_seconds).toBe(120);
  });

  it("starts with default state before any fetch", () => {
    expect(settingsStore.settings.theme).toBe("S");
    expect(settingsStore.settings.preferred_weight_unit).toBe("kg");
    expect(settingsStore.settings.rest_timer_duration_seconds).toBe(90);
  });

  it("updates settings via API and reflects new values in store", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          settings: {
            theme: "L",
            preferred_weight_unit: "kg",
            preferred_length_unit: "cm",
            language: "en",
            rest_timer_duration_seconds: 90,
            notifications_enabled: false,
          },
        }),
      }),
    );

    await settingsStore.updateSettings({ theme: "L", notifications_enabled: false });

    expect(settingsStore.settings.theme).toBe("L");
    expect(settingsStore.settings.notifications_enabled).toBe(false);
  });

  it("throws when updateSettings API call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal Server Error" }),
      }),
    );

    await expect(settingsStore.updateSettings({ theme: "D" })).rejects.toThrow(
      "Internal Server Error",
    );
  });
});
