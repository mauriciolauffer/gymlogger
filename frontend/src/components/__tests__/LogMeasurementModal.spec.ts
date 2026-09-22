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

  it("shows error message when API call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid measurement data" }),
      }),
    );

    const wrapper = mount(LogMeasurementModal, { props: { open: true } });

    const weightInput = wrapper.find("ui5-input");
    (weightInput.element as HTMLInputElement).value = "80.0";
    await weightInput.trigger("input");

    const saveBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Save"));
    await saveBtn!.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Invalid measurement data");
  });

  it("emits close when dialog close event fires", async () => {
    const wrapper = mount(LogMeasurementModal, { props: { open: true } });

    const dialog = wrapper.find("ui5-dialog");
    await dialog.trigger("close");

    expect(wrapper.emitted("close")).toBeTruthy();
  });
});
