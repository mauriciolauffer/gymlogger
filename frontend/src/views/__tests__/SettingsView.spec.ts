import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import SettingsView from "../SettingsView.vue";

describe("SettingsView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches, updates controls and saves user settings", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url, opts) => {
      if (opts?.method === "PUT") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            settings: {
              theme: "dark",
              preferred_weight_unit: "lb",
              preferred_length_unit: "in",
              language: "en",
              rest_timer_duration_seconds: 120,
              notifications_enabled: true,
            },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          settings: {
            theme: "system",
            preferred_weight_unit: "kg",
            preferred_length_unit: "cm",
            language: "en",
            rest_timer_duration_seconds: 90,
            notifications_enabled: true,
          },
        }),
      });
    }));

    const wrapper = mount(SettingsView);
    await new Promise((r) => setTimeout(r, 50));

    const saveBtn = wrapper.find("ui5-button");
    await saveBtn.trigger("click");
    await new Promise((r) => setTimeout(r, 50));

    expect(wrapper.text()).toContain("Preferences saved successfully!");
  });
});
