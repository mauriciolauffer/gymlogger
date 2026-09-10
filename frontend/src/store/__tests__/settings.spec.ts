import { describe, it, expect, vi, beforeEach } from "vitest";
import { settingsStore } from "../settings";

describe("Settings Store", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches settings from API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          settings: {
            theme: "dark",
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

    expect(settingsStore.settings.theme).toBe("dark");
    expect(settingsStore.settings.preferred_weight_unit).toBe("lbs");
    expect(settingsStore.settings.rest_timer_duration_seconds).toBe(120);
  });

  it("updates settings via API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          settings: {
            theme: "light",
            preferred_weight_unit: "kg",
            preferred_length_unit: "cm",
            language: "en",
            rest_timer_duration_seconds: 90,
            notifications_enabled: false,
          },
        }),
      }),
    );

    await settingsStore.updateSettings({ theme: "light", notifications_enabled: false });

    expect(settingsStore.settings.theme).toBe("light");
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

    await expect(settingsStore.updateSettings({ theme: "dark" })).rejects.toThrow(
      "Internal Server Error",
    );
  });
});
