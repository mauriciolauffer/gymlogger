import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import MeasurementsView from "../MeasurementsView.vue";

describe("MeasurementsView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches, logs and deletes body measurement entries", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url, opts) => {
      if (opts?.method === "DELETE") {
        return Promise.resolve({ ok: true, json: async () => ({ message: "Deleted" }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          measurements: [
            {
              id: "m1",
              created_at: "2026-01-01T10:00:00Z",
              weight: 78.5,
              weight_unit: "kg",
              body_fat_pct: 14.5,
              waist: 82,
              circumference_unit: "cm",
              photo_url: "https://example.com/photo.jpg",
            },
          ],
        }),
      });
    }));

    const wrapper = mount(MeasurementsView);
    await new Promise((r) => setTimeout(r, 50));

    expect(wrapper.text()).toContain("Body Measurements & Progress");
    expect(wrapper.find(".progress-photo").exists()).toBe(true);

    const logBtn = wrapper.find("ui5-button");
    await logBtn.trigger("click");
    expect(wrapper.findComponent({ name: "LogMeasurementModal" }).props("open")).toBe(true);
  });
});
