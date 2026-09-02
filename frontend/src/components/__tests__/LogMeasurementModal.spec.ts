import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import LogMeasurementModal from "../LogMeasurementModal.vue";

describe("LogMeasurementModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles body measurement logging", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ measurement: { id: "m1" } }),
    }));

    const wrapper = mount(LogMeasurementModal, {
      props: { open: true },
    });

    const weightInput = wrapper.find("ui5-input");
    (weightInput.element as any).value = "80.0";
    await weightInput.trigger("input");

    const buttons = wrapper.findAll("ui5-button");
    await buttons[1].trigger("click");

    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.emitted("saved")).toBeTruthy();
  });
});
