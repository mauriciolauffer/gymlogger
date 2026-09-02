import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import WarmupCalculatorModal from "../WarmupCalculatorModal.vue";

describe("WarmupCalculatorModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calculates warmup sets on target weight change", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        warmupSets: [
          { percentage: 50, weight: 50, reps: 10, notes: "Bar only / light" },
          { percentage: 70, weight: 70, reps: 5, notes: "Moderate" },
        ],
      }),
    }));

    const wrapper = mount(WarmupCalculatorModal, {
      props: { open: true, targetWeight: 100 },
    });

    await new Promise((r) => setTimeout(r, 50));

    const calcBtn = wrapper.find("ui5-button");
    await calcBtn.trigger("click");

    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.text()).toContain("Suggested Warm-Up Progression");
    expect(wrapper.text()).toContain("Set 1: 50 kg × 10 reps");
  });
});
