import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ExerciseDetailModal from "../ExerciseDetailModal.vue";

describe("ExerciseDetailModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("displays exercise name as dialog header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          oneRmCurve: [{ date: "2026-01-01", value: 100 }],
          maxWeightCurve: [],
          maxRepsCurve: [],
          sessions: [],
        }),
      }),
    );

    const wrapper = mount(ExerciseDetailModal, {
      props: { open: true, exercise: { id: "ex1", name: "Bench Press", category: "barbell" } },
    });
    await flushPromises();

    expect(wrapper.find("ui5-dialog").attributes("header-text")).toBe("Bench Press");
  });

  it("displays exercise category", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ oneRmCurve: [], maxWeightCurve: [], maxRepsCurve: [], sessions: [] }),
      }),
    );

    const wrapper = mount(ExerciseDetailModal, {
      props: { open: true, exercise: { id: "ex1", name: "Bench Press", category: "barbell" } },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("barbell");
  });

  it("handles fetch error gracefully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const wrapper = mount(ExerciseDetailModal, {
      props: { open: true, exercise: { id: "ex1", name: "Squat", category: "barbell" } },
    });
    await flushPromises();

    expect(wrapper.find("ui5-dialog").attributes("header-text")).toBe("Squat");
  });
});
