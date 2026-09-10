import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ActiveWorkoutView from "../ActiveWorkoutView.vue";
import { activeWorkoutStore } from "../../store/activeWorkout";

const mockPush = vi.fn<() => void>();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const activeWorkout = {
  id: "w1",
  title: "Leg Day",
  start_time: new Date().toISOString(),
  total_volume: 500,
  set_count: 2,
  exercises: [
    {
      id: "we1",
      exercise_id: "ex1",
      exercise_name: "Squat",
      previousSets: [{ weight: 100, reps: 5 }],
      sets: [{ id: "s1", set_type: "normal", weight: 100, reps: 5, order_index: 0 }],
    },
  ],
};

const makeFetch = () =>
  vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes("/exercises") && !url.includes("/workout-exercises")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ exercises: [{ id: "ex1", name: "Squat" }] }),
      });
    }
    if (opts?.method === "POST" && url.includes("/sets")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          set: { id: "s2", weight: 100, reps: 10, set_type: "normal" },
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
    return Promise.resolve({ ok: true, json: async () => ({ workout: activeWorkout }) });
  });

describe("ActiveWorkoutView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the workout title and stats", async () => {
    vi.stubGlobal("fetch", makeFetch());
    await activeWorkoutStore.fetchActiveWorkout("w1");
    const wrapper = mount(ActiveWorkoutView);
    await flushPromises();

    expect(wrapper.text()).toContain("Leg Day");
  });

  it("shows the finish workout dialog when finish button is clicked", async () => {
    vi.stubGlobal("fetch", makeFetch());
    await activeWorkoutStore.fetchActiveWorkout("w1");
    const wrapper = mount(ActiveWorkoutView);
    await flushPromises();

    await wrapper.find(".workout-header ui5-button").trigger("click");

    const finishDialog = wrapper
      .findAll("ui5-dialog")
      .find((d) => d.attributes("header-text") === "Finish Workout Session");
    expect(finishDialog).toBeDefined();
  });

  it("navigates to workouts after completing session", async () => {
    vi.stubGlobal("fetch", makeFetch());
    await activeWorkoutStore.fetchActiveWorkout("w1");
    const wrapper = mount(ActiveWorkoutView);
    await flushPromises();

    await wrapper.find(".workout-header ui5-button").trigger("click");

    const finishDialog = wrapper
      .findAll("ui5-dialog")
      .find((d) => d.attributes("header-text") === "Finish Workout Session")!;

    const completeBtn = finishDialog
      .findAll("ui5-button")
      .find((b) => b.text().includes("Complete"));
    await completeBtn!.trigger("click");
    await flushPromises();

    expect(mockPush).toHaveBeenCalledWith("/workouts");
  });

  it("shows the add exercise modal when add exercise button is clicked", async () => {
    vi.stubGlobal("fetch", makeFetch());
    await activeWorkoutStore.fetchActiveWorkout("w1");
    const wrapper = mount(ActiveWorkoutView);
    await flushPromises();

    await wrapper.find(".bottom-actions ui5-button").trigger("click");

    const addDialog = wrapper
      .findAll("ui5-dialog")
      .find((d) => d.attributes("header-text") === "Add Exercise to Workout");
    expect(addDialog).toBeDefined();
  });
});
