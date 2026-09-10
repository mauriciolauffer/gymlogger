import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import LogMeasurementModal from "../LogMeasurementModal.vue";

describe("LogMeasurementModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("emits 'saved' after successful measurement log", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ measurement: { id: "m1" } }),
      }),
    );

    const wrapper = mount(LogMeasurementModal, { props: { open: true } });

    const weightInput = wrapper.find("ui5-input");
    (weightInput.element as HTMLInputElement).value = "80.0";
    await weightInput.trigger("input");

    const saveBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Save"));
    await saveBtn!.trigger("click");
    await flushPromises();

    expect(wrapper.emitted("saved")).toBeTruthy();
  });

  it("shows validation error when no fields are filled", async () => {
    const wrapper = mount(LogMeasurementModal, { props: { open: true } });

    const saveBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Save"));
    await saveBtn!.trigger("click");

    expect(wrapper.text()).toContain("Please enter at least one measurement metric.");
  });

  it("emits 'close' when cancel is clicked", async () => {
    const wrapper = mount(LogMeasurementModal, { props: { open: true } });

    const cancelBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Cancel"));
    await cancelBtn!.trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
  });
});
