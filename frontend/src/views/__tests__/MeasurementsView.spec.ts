import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import MeasurementsView from "../MeasurementsView.vue";

const mockMeasurement = {
  id: "m1",
  created_at: "2026-01-01T10:00:00Z",
  weight: 78.5,
  weight_unit: "kg",
  body_fat_pct: 14.5,
  waist: 82,
  length_unit: "cm",
  photo_url: "https://example.com/photo.jpg",
};

describe("MeasurementsView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the page title", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ measurements: [mockMeasurement] }),
      }),
    );

    const wrapper = mount(MeasurementsView);
    await flushPromises();

    expect(wrapper.text()).toContain("Body Measurements & Progress");
  });

  it("displays measurement entries after fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ measurements: [mockMeasurement] }),
      }),
    );

    const wrapper = mount(MeasurementsView);
    await flushPromises();

    expect(wrapper.find(".progress-photo").exists()).toBe(true);
  });

  it("opens log measurement modal on button click", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ measurements: [] }),
      }),
    );

    const wrapper = mount(MeasurementsView);
    await flushPromises();

    const logBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Log Measurement"));
    await logBtn!.trigger("click");

    expect(wrapper.findComponent({ name: "LogMeasurementModal" }).props("open")).toBe(true);
  });

  it("shows empty state when no measurements exist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ measurements: [] }),
      }),
    );

    const wrapper = mount(MeasurementsView);
    await flushPromises();

    expect(wrapper.text()).toContain("No body measurements");
  });
});
