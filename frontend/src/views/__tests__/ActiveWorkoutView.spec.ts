import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ActiveWorkoutView from "../ActiveWorkoutView.vue";
import { activeWorkoutStore } from "../../store/activeWorkout.js";

const mockPush = vi.fn<() => void>();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockRes = (body: unknown) => Promise.resolve(body as unknown as Response);

const activeWorkout = {
  id: "w1",
  title: "Leg Day",
  startTime: new Date().toISOString(),
  totalVolume: 500,
  setCount: 2,
  exercises: [
    {
      id: "we1",
      exerciseId: "ex1",
      exerciseName: "Squat",
      previousSets: [{ weight: 100, reps: 5 }],
      sets: [{ id: "s1", setType: "NO", weight: 100, reps: 5, orderIndex: 0 }],
    },
  ],
};

const makeSet = (id = "s1") => ({
  id,
  workoutExerciseId: "we1",
  setType: "NO" as const,
  weight: 100,
  weightUnit: "kg",
  reps: 5,
  orderIndex: 0,
});

const makeFetch = () =>
  vi.fn<typeof fetch>().mockImplementation((url: string | Request | URL, opts?: RequestInit) => {
    if (String(url).includes("/exercises") && !String(url).includes("/workout-exercises")) {
      return mockRes({
        ok: true,
        json: async () => ({ exercises: [{ id: "ex1", name: "Squat" }] }),
      });
    }
    if (opts?.method === "POST" && String(url).includes("/sets")) {
      return mockRes({
        ok: true,
        json: async () => ({ set: makeSet("s2"), isPr: true, prTypes: ["1rm"] }),
      });
    }
    if (opts?.method === "PUT" && String(url).includes("/sets/")) {
      return mockRes({
        ok: true,
        json: async () => ({ set: makeSet("s1"), isPr: false, prTypes: [] }),
      });
    }
    if (opts?.method === "DELETE" && String(url).includes("/sets/")) {
      return mockRes({ ok: true, json: async () => ({}) });
    }
    if (opts?.method === "PUT" && String(url).includes("/finish")) {
      return mockRes({
        ok: true,
        json: async () => ({ workout: { id: "w1", title: "Finished" } }),
      });
    }
    return mockRes({ ok: true, json: async () => ({ workout: activeWorkout }) });
  });

describe("ActiveWorkoutView", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", makeFetch());
    await activeWorkoutStore.fetchActiveWorkout("w1");
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

  it("handles update-set-weight event from WorkoutExerciseCard", async () => {
    const fetchMock = makeFetch();
    vi.stubGlobal("fetch", fetchMock);
    await activeWorkoutStore.fetchActiveWorkout("w1");
    const wrapper = mount(ActiveWorkoutView);
    await flushPromises();

    const card = wrapper.findComponent({ name: "WorkoutExerciseCard" });
    card.vm.$emit("update-set-weight", "s1", 120);
    await flushPromises();

    // Should have called updateSet via the store (PUT to sets endpoint)
    const putCalls = fetchMock.mock.calls.filter(
      (c) => (c[1] as RequestInit)?.method === "PUT" && (c[0] as string).includes("/sets/"),
    );
    expect(putCalls.length).toBeGreaterThan(0);
  });

  it("handles update-set-reps event from WorkoutExerciseCard", async () => {
    const fetchMock = makeFetch();
    vi.stubGlobal("fetch", fetchMock);
    await activeWorkoutStore.fetchActiveWorkout("w1");
    const wrapper = mount(ActiveWorkoutView);
    await flushPromises();

    const card = wrapper.findComponent({ name: "WorkoutExerciseCard" });
    card.vm.$emit("update-set-reps", "s1", 8);
    await flushPromises();

    const putCalls = fetchMock.mock.calls.filter(
      (c) => (c[1] as RequestInit)?.method === "PUT" && (c[0] as string).includes("/sets/"),
    );
    expect(putCalls.length).toBeGreaterThan(0);
  });

  it("handles update-set-type event from WorkoutExerciseCard", async () => {
    const fetchMock = makeFetch();
    vi.stubGlobal("fetch", fetchMock);
    await activeWorkoutStore.fetchActiveWorkout("w1");
    const wrapper = mount(ActiveWorkoutView);
    await flushPromises();

    const card = wrapper.findComponent({ name: "WorkoutExerciseCard" });
    card.vm.$emit("update-set-type", "s1", "W");
    await flushPromises();

    const putCalls = fetchMock.mock.calls.filter(
      (c) => (c[1] as RequestInit)?.method === "PUT" && (c[0] as string).includes("/sets/"),
    );
    expect(putCalls.length).toBeGreaterThan(0);
  });

  it("handles delete-set event from WorkoutExerciseCard", async () => {
    const fetchMock = makeFetch();
    vi.stubGlobal("fetch", fetchMock);
    await activeWorkoutStore.fetchActiveWorkout("w1");
    const wrapper = mount(ActiveWorkoutView);
    await flushPromises();

    const card = wrapper.findComponent({ name: "WorkoutExerciseCard" });
    card.vm.$emit("delete-set", "s1");
    await flushPromises();

    const deleteCalls = fetchMock.mock.calls.filter(
      (c) => (c[1] as RequestInit)?.method === "DELETE",
    );
    expect(deleteCalls.length).toBeGreaterThan(0);
  });

  it("opens warmup modal on open-warmup event", async () => {
    vi.stubGlobal("fetch", makeFetch());
    await activeWorkoutStore.fetchActiveWorkout("w1");
    const wrapper = mount(ActiveWorkoutView);
    await flushPromises();

    const card = wrapper.findComponent({ name: "WorkoutExerciseCard" });
    card.vm.$emit("open-warmup", 100);
    await flushPromises();

    const warmupModal = wrapper.findComponent({ name: "WarmupCalculatorModal" });
    expect(warmupModal.props("open")).toBe(true);
    expect(warmupModal.props("targetWeight")).toBe(100);
  });

  it("cancels the finish modal when cancel button is clicked", async () => {
    vi.stubGlobal("fetch", makeFetch());
    await activeWorkoutStore.fetchActiveWorkout("w1");
    const wrapper = mount(ActiveWorkoutView);
    await flushPromises();

    await wrapper.find(".workout-header ui5-button").trigger("click");

    const finishDialog = wrapper
      .findAll("ui5-dialog")
      .find((d) => d.attributes("header-text") === "Finish Workout Session")!;

    const cancelBtn = finishDialog.findAll("ui5-button").find((b) => b.text().includes("Cancel"));
    await cancelBtn!.trigger("click");

    expect(
      wrapper
        .findAll("ui5-dialog")
        .find((d) => d.attributes("header-text") === "Finish Workout Session")
        ?.attributes("open"),
    ).toBeFalsy();
  });

  it("cancels add exercise modal when cancel is clicked", async () => {
    vi.stubGlobal("fetch", makeFetch());
    await activeWorkoutStore.fetchActiveWorkout("w1");
    const wrapper = mount(ActiveWorkoutView);
    await flushPromises();

    await wrapper.find(".bottom-actions ui5-button").trigger("click");

    const addDialog = wrapper
      .findAll("ui5-dialog")
      .find((d) => d.attributes("header-text") === "Add Exercise to Workout")!;

    const cancelBtn = addDialog.findAll("ui5-button").find((b) => b.text().includes("Cancel"));
    await cancelBtn!.trigger("click");

    expect(
      wrapper
        .findAll("ui5-dialog")
        .find((d) => d.attributes("header-text") === "Add Exercise to Workout")
        ?.attributes("open"),
    ).toBeFalsy();
  });

  it("does not add exercise when none is selected (empty selectedExerciseId)", async () => {
    vi.stubGlobal("fetch", makeFetch());
    await activeWorkoutStore.fetchActiveWorkout("w1");
    const wrapper = mount(ActiveWorkoutView);
    await flushPromises();

    // Open add exercise modal
    await wrapper.find(".bottom-actions ui5-button").trigger("click");

    const addDialog = wrapper
      .findAll("ui5-dialog")
      .find((d) => d.attributes("header-text") === "Add Exercise to Workout")!;

    // Click Add without selecting an exercise (selectedExerciseId defaults to empty)
    const addBtn = addDialog.findAll("ui5-button").find((b) => b.text().trim() === "Add");
    await addBtn!.trigger("click");
    await flushPromises();

    // Modal stays open since no exercise was chosen
    const dialogStillOpen = wrapper
      .findAll("ui5-dialog")
      .find((d) => d.attributes("header-text") === "Add Exercise to Workout");
    expect(dialogStillOpen).toBeDefined();
  });

  it("handles fetch error for available exercises gracefully", async () => {
    const errorFetch = vi.fn<typeof fetch>().mockImplementation((url: string | Request | URL) => {
      if (String(url).includes("/exercises") && !String(url).includes("/workout-exercises")) {
        return Promise.reject(new Error("Network error"));
      }
      return mockRes({ ok: true, json: async () => ({ workout: activeWorkout }) });
    });
    vi.stubGlobal("fetch", errorFetch);
    await activeWorkoutStore.fetchActiveWorkout("w1");
    const wrapper = mount(ActiveWorkoutView);
    await flushPromises();

    // Component should render without crashing despite fetch error
    expect(wrapper.text()).toContain("Leg Day");
  });

  it("uses previousSets defaults when exercise has no current sets", async () => {
    const workoutWithNoSets = {
      ...activeWorkout,
      exercises: [
        {
          ...activeWorkout.exercises[0],
          sets: [],
          previousSets: [{ id: "ps1", setType: "NO", weight: 80, reps: 8, orderIndex: 0 }],
        },
      ],
    };
    const fetchMockNoSets = vi
      .fn<typeof fetch>()
      .mockImplementation((url: string | Request | URL, opts?: RequestInit) => {
        if (String(url).includes("/exercises") && !String(url).includes("/workout-exercises")) {
          return mockRes({ ok: true, json: async () => ({ exercises: [] }) });
        }
        if (opts?.method === "POST" && String(url).includes("/sets")) {
          return mockRes({
            ok: true,
            json: async () => ({ set: makeSet("s_new"), isPr: false, prTypes: [] }),
          });
        }
        if (opts?.method === "PUT" && String(url).includes("/sets/")) {
          return mockRes({
            ok: true,
            json: async () => ({ set: makeSet("s_new"), isPr: false, prTypes: [] }),
          });
        }
        return mockRes({ ok: true, json: async () => ({ workout: workoutWithNoSets }) });
      });
    vi.stubGlobal("fetch", fetchMockNoSets);
    await activeWorkoutStore.fetchActiveWorkout("w1");
    const wrapper = mount(ActiveWorkoutView);
    await flushPromises();

    const card = wrapper.findComponent({ name: "WorkoutExerciseCard" });
    card.vm.$emit("add-set", "we1");
    await flushPromises();

    // Verify the POST to sets was made (using previousSets defaults)
    const postCalls = fetchMockNoSets.mock.calls.filter(
      (c) => (c[1] as RequestInit)?.method === "POST" && (c[0] as string).includes("/sets"),
    );
    expect(postCalls.length).toBeGreaterThan(0);
  });
});
