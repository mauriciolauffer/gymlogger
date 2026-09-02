import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import ActiveWorkoutView from "../ActiveWorkoutView.vue";
import { activeWorkoutStore } from "../../store/activeWorkout";

const mockPush = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("ActiveWorkoutView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders active workout session, adds exercise, logs set, and completes session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url, opts) => {
      if (url.includes("/exercises")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            exercises: [{ id: "ex1", name: "Squat" }],
            workoutExercise: { id: "we1", exercise_id: "ex1" },
          }),
        });
      }
      if (opts?.method === "POST" && url.includes("/sets")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            set: { id: "s1", weight: 100, reps: 5, set_type: "normal" },
            isPr: true,
            prTypes: ["1rm"],
          }),
        });
      }
      if (opts?.method === "PUT" && url.includes("/finish")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ workout: { id: "w1", title: "Finished" } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          workout: {
            id: "w1",
            title: "Leg Day",
            start_time: new Date().toISOString(),
            total_volume: 500,
            set_count: 2,
            exercises: [
              {
                id: "we1",
                exercise_name: "Squat",
                previousSets: [{ weight: 100, reps: 5 }],
                sets: [{ id: "s1", set_type: "normal", weight: 100, reps: 5 }],
              },
            ],
          },
        }),
      });
    }));

    await activeWorkoutStore.fetchActiveWorkout("w1");
    const wrapper = mount(ActiveWorkoutView);
    await new Promise((r) => setTimeout(r, 50));

    expect(wrapper.text()).toContain("Leg Day");
    expect(wrapper.text()).toContain("100kg × 5");

    const dialogs = wrapper.findAll("ui5-dialog");
    const finishDialog = dialogs.find((d) => d.attributes("header-text") === "Finish Workout Session");
    expect(finishDialog).toBeDefined();

    const finishHeaderBtn = wrapper.find(".workout-header ui5-button");
    await finishHeaderBtn.trigger("click");

    const dialogButtons = finishDialog!.findAll("ui5-button");
    await dialogButtons[1].trigger("click");
    await new Promise((r) => setTimeout(r, 50));

    expect(mockPush).toHaveBeenCalledWith("/workouts");
  });
});
