import { describe, it, expect, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { flushPromises } from "@vue/test-utils";
import AnalyticsView from "../AnalyticsView.vue";

const mockFetch = (url: string) => {
  if (url.includes("/monthly-report")) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        totalWorkouts: 12,
        totalVolume: 45000,
        totalDurationSeconds: 43200,
        topPRs: [{ exerciseName: "Deadlift", prType: "1rm", value: 200 }],
        muscleDistribution: [
          { muscleGroupId: "mg1", muscleGroup: "Back", setCount: 40, percentage: 30 },
        ],
      }),
    });
  }
  if (url.includes("/sets-per-muscle-group")) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        setsPerMuscleGroup: [
          {
            muscleGroupId: "mg1",
            muscleGroup: "Back",
            setCount: 10,
            hypertrophyTargetMin: 10,
            hypertrophyTargetMax: 20,
          },
        ],
      }),
    });
  }
  if (url.includes("/consistency")) {
    return Promise.resolve({
      ok: true,
      json: async () => ({ currentStreakDays: 4, totalWorkouts: 12, activeDates: [] }),
    });
  }
  return Promise.resolve({ ok: true, json: async () => ({}) });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AnalyticsView", () => {
  it("renders the analytics page title", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(mockFetch));
    const wrapper = mount(AnalyticsView);
    await flushPromises();

    expect(wrapper.text()).toContain("Monthly Report & Analytics");
  });

  it("displays monthly report data after fetch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(mockFetch));
    const wrapper = mount(AnalyticsView);
    await flushPromises();

    expect(wrapper.text()).toContain("Total Workouts");
    expect(wrapper.text()).toContain("Deadlift");
  });

  it("shows empty state when fetch returns no data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    const wrapper = mount(AnalyticsView);
    await flushPromises();

    expect(wrapper.text()).toContain("Monthly Report & Analytics");
  });

  it("handles fetch error gracefully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const wrapper = mount(AnalyticsView);
    await flushPromises();

    expect(wrapper.text()).toContain("Monthly Report & Analytics");
  });
});
