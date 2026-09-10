import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import SettingsView from "../SettingsView.vue";

const mockSettings = {
  theme: "system",
  preferred_weight_unit: "kg",
  preferred_length_unit: "cm",
  language: "en",
  rest_timer_duration_seconds: 90,
  notifications_enabled: true,
};

describe("SettingsView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders settings card", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ settings: mockSettings }),
      }),
    );

    const wrapper = mount(SettingsView);
    await flushPromises();

    expect(wrapper.find("ui5-card-header").attributes("title-text")).toBe("System Settings");
  });

  it("saves settings and shows success message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url, opts) => {
        if (opts?.method === "PUT") {
          return Promise.resolve({ ok: true, json: async () => ({ settings: mockSettings }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ settings: mockSettings }) });
      }),
    );

    const wrapper = mount(SettingsView);
    await flushPromises();

    const saveBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Save"));
    await saveBtn!.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Preferences saved successfully!");
  });

  it("shows error message when save fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url, opts) => {
        if (opts?.method === "PUT") {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: "Save failed" }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ settings: mockSettings }) });
      }),
    );

    const wrapper = mount(SettingsView);
    await flushPromises();

    const saveBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Save"));
    await saveBtn!.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Save failed");
  });
});
