import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import AnalyticsView from "../AnalyticsView.vue";

describe("AnalyticsView", () => {
  it("renders monthly analytics summary report", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url) => {
      if (url.includes("/monthly-report")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            totalWorkouts: 12,
            totalVolume: 45000,
            totalDurationSeconds: 43200,
            topPrs: [{ exercise_name: "Deadlift", pr_type: "1rm", value: 200 }],
            muscleDistribution: [{ muscle_name: "Back", set_count: 40, percentage: 30 }],
            weeklyMuscleTargetProgress: [{ muscle_name: "Back", weekly_sets: 10, target_min: 10, target_max: 20 }],
          }),
        });
      }
      if (url.includes("/consistency")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ currentStreak: 4 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    }));

    const wrapper = mount(AnalyticsView);
    await new Promise((r) => setTimeout(r, 50));

    expect(wrapper.text()).toContain("Monthly Report & Analytics");
    expect(wrapper.text()).toContain("Total Workouts");
    expect(wrapper.text()).toContain("Deadlift");
  });
});
