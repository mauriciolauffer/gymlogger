import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ExerciseDetailModal from "../ExerciseDetailModal.vue";

describe("ExerciseDetailModal", () => {
  it("fetches exercise performance analytics", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        oneRmCurve: [{ date: "2026-01-01", value: 100 }],
        maxWeightCurve: [{ date: "2026-01-01", value: 90 }],
        maxRepsCurve: [{ date: "2026-01-01", value: 10 }],
        sessions: [],
      }),
    }));

    const wrapper = mount(ExerciseDetailModal, {
      props: {
        open: true,
        exercise: { id: "ex1", name: "Bench Press", category: "barbell" },
      },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.find("ui5-dialog").attributes("header-text")).toBe("Bench Press");
    expect(wrapper.text()).toContain("barbell");
  });
});
