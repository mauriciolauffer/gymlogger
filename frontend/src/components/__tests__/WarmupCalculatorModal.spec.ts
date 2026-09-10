import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import WarmupCalculatorModal from "../WarmupCalculatorModal.vue";

describe("WarmupCalculatorModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows warmup sets after calculate click", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          warmupSets: [
            { percentage: 50, weight: 50, reps: 10, notes: "Bar only / light" },
            { percentage: 70, weight: 70, reps: 5, notes: "Moderate" },
          ],
        }),
      }),
    );

    const wrapper = mount(WarmupCalculatorModal, {
      props: { open: true, targetWeight: 100 },
    });
    await flushPromises();

    await wrapper
      .findAll("ui5-button")
      .find((b) => b.text().includes("Calculate"))!
      .trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Suggested Warm-Up Progression");
    expect(wrapper.text()).toContain("Set 1: 50 kg × 10 reps");
  });

  it("emits 'close' when close button is clicked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ warmupSets: [] }),
      }),
    );

    const wrapper = mount(WarmupCalculatorModal, {
      props: { open: true, targetWeight: 100 },
    });

    await wrapper
      .findAll("ui5-button")
      .find((b) => b.text().includes("Close"))!
      .trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
  });
});
