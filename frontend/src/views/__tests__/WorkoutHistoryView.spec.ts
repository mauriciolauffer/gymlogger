import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import WorkoutHistoryView from "../WorkoutHistoryView.vue";

const mockPush = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("WorkoutHistoryView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
  });

  it("fetches workout history, views detail modal, deletes workout and starts empty workout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url, opts) => {
      if (opts?.method === "DELETE") {
        return Promise.resolve({ ok: true, json: async () => ({ message: "Deleted" }) });
      }
      if (url.includes("/start")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            workout: { id: "w_new", title: "Empty Session", start_time: new Date().toISOString(), total_volume: 0, set_count: 0, exercises: [] },
          }),
        });
      }
      if (url.includes("/workouts/w1")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            workout: { id: "w1", title: "Upper Body Hypertrophy", exercises: [] },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          workouts: [
            {
              id: "w1",
              title: "Upper Body Hypertrophy",
              start_time: "2026-01-01T10:00:00Z",
              duration_seconds: 2700,
              total_volume: 8500,
            },
          ],
        }),
      });
    }));

    const wrapper = mount(WorkoutHistoryView);
    await new Promise((r) => setTimeout(r, 50));

    expect(wrapper.text()).toContain("Workout History");

    const deleteBtn = wrapper.find("ui5-list-item-standard ui5-button");
    await deleteBtn.trigger("click");

    const startBtn = wrapper.find(".header-actions ui5-button");
    await startBtn.trigger("click");
    await new Promise((r) => setTimeout(r, 50));
    expect(mockPush).toHaveBeenCalledWith("/active-workout");

    const listItem = wrapper.find("ui5-list-item-standard");
    await listItem.trigger("click");
    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.findComponent({ name: "WorkoutDetailModal" }).props("open")).toBe(true);
  });
});
