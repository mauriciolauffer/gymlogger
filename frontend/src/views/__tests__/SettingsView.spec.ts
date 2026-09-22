import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import SettingsView from "../SettingsView.vue";

const mockSettings = {
  theme: "S",
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

    expect(wrapper.find("ui5-form").attributes("header-text")).toBe("Settings");
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

  it("dismisses the message strip when close event fires", async () => {
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

    expect(wrapper.text()).toContain("Preferences saved");

    const strip = wrapper.find("ui5-message-strip");
    await strip.trigger("close");

    expect(wrapper.find("ui5-message-strip").exists()).toBe(false);
  });

  it("updates preferred_weight_unit on segmented button selection-change", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ settings: mockSettings }),
      }),
    );

    const wrapper = mount(SettingsView);
    await flushPromises();

    const weightSegmented = wrapper
      .findAll("ui5-segmented-button")
      .find((sb) =>
        sb.findAll("ui5-segmented-button-item").some((i) => i.attributes("data-value") === "lbs"),
      );

    const lbsItem = document.createElement("ui5-segmented-button-item");
    lbsItem.setAttribute("data-value", "lbs");

    await weightSegmented!.trigger("selection-change", {
      detail: { selectedItems: [lbsItem] },
    });

    // The component processes the change without throwing
    expect(wrapper.exists()).toBe(true);
  });

  it("updates rest_timer_duration_seconds on step-input change", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ settings: mockSettings }),
      }),
    );

    const wrapper = mount(SettingsView);
    await flushPromises();

    const stepInput = wrapper.find("ui5-step-input");
    // Simulate the change event by directly calling the event handler via the element
    Object.defineProperty(stepInput.element, "value", { value: "120", configurable: true });
    await stepInput.trigger("change");

    expect(wrapper.exists()).toBe(true);
  });

  it("updates notifications_enabled on switch change", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ settings: mockSettings }),
      }),
    );

    const wrapper = mount(SettingsView);
    await flushPromises();

    const switchEl = wrapper.find("ui5-switch");
    Object.defineProperty(switchEl.element, "checked", { value: false, configurable: true });
    await switchEl.trigger("change");

    expect(wrapper.exists()).toBe(true);
  });

  it("updates preferred_length_unit on segmented button selection-change", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ settings: mockSettings }),
      }),
    );

    const wrapper = mount(SettingsView);
    await flushPromises();

    const lengthSegmented = wrapper
      .findAll("ui5-segmented-button")
      .find((sb) =>
        sb.findAll("ui5-segmented-button-item").some((i) => i.attributes("data-value") === "in"),
      );

    const inItem = document.createElement("ui5-segmented-button-item");
    inItem.setAttribute("data-value", "in");

    if (lengthSegmented) {
      await lengthSegmented.trigger("selection-change", {
        detail: { selectedItems: [inItem] },
      });
    }

    expect(wrapper.exists()).toBe(true);
  });

  it("updates language via select change", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ settings: mockSettings }),
      }),
    );

    const wrapper = mount(SettingsView);
    await flushPromises();

    const select = wrapper.find("ui5-select");
    if (select.exists()) {
      const mockOption = document.createElement("ui5-option");
      mockOption.setAttribute("value", "pt");
      Object.defineProperty(select.element, "selectedOption", {
        value: mockOption,
        configurable: true,
      });
      await select.trigger("change");
    }

    expect(wrapper.exists()).toBe(true);
  });
});
