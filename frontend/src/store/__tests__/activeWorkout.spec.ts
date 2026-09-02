import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { activeWorkoutStore } from "../activeWorkout";

describe("Active Workout Store", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts workout and duration timer", async () => {
    const mockWorkout = {
      id: "w1",
      title: "Leg Day",
      start_time: new Date().toISOString(),
      total_volume: 0,
      set_count: 0,
      exercises: [],
    };

    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: async () => ({ workout: mockWorkout }),
      });
    }));

    await activeWorkoutStore.startWorkout("Leg Day");

    expect(activeWorkoutStore.isWorkingOut).toBe(true);
    expect(activeWorkoutStore.workout?.title).toBe("Leg Day");

    vi.advanceTimersByTime(2000);
    expect(activeWorkoutStore.elapsedSeconds).toBeGreaterThanOrEqual(1);
  });

  it("manages rest timer", () => {
    activeWorkoutStore.startRestTimer(60);

    expect(activeWorkoutStore.restTimer.active).toBe(true);
    expect(activeWorkoutStore.restTimer.remaining).toBe(60);

    vi.advanceTimersByTime(3000);
    expect(activeWorkoutStore.restTimer.remaining).toBe(57);

    activeWorkoutStore.stopRestTimer();
    expect(activeWorkoutStore.restTimer.active).toBe(false);
  });

  it("fetches active workout, adds exercise, logs set, updates set, deletes set and finishes workout", async () => {
    const mockWorkout = {
      id: "w1",
      title: "Full Body",
      start_time: new Date().toISOString(),
      total_volume: 100,
      set_count: 1,
      exercises: [],
    };

    vi.stubGlobal("fetch", vi.fn().mockImplementation((url, opts) => {
      if (url.includes("/previous-values")) {
        return Promise.resolve({ ok: true, json: async () => ({ sets: [] }) });
      }
      if (opts?.method === "POST" && url.includes("/exercises")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ workoutExercise: { id: "we1", exercise_id: "ex1", sets: [] } }),
        });
      }
      if (opts?.method === "POST" && url.includes("/sets")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            set: { id: "s1", weight: 60, reps: 8, set_type: "normal" },
            isPr: true,
            prTypes: ["1rm"],
          }),
        });
      }
      if (opts?.method === "PUT" && url.includes("/sets/s1")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            set: { id: "s1", weight: 70, reps: 8, set_type: "normal" },
            isPr: false,
            prTypes: [],
          }),
        });
      }
      if (opts?.method === "DELETE" && url.includes("/sets/s1")) {
        return Promise.resolve({ ok: true, json: async () => ({ message: "Set deleted" }) });
      }
      if (opts?.method === "PUT" && url.includes("/finish")) {
        return Promise.resolve({ ok: true, json: async () => ({ workout: mockWorkout }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ workout: mockWorkout }) });
    }));

    await activeWorkoutStore.fetchActiveWorkout("w1");
    expect(activeWorkoutStore.workout?.id).toBe("w1");

    await activeWorkoutStore.addExercise("ex1");
    expect(activeWorkoutStore.workout?.exercises.length).toBe(1);

    const logRes = await activeWorkoutStore.logSet("we1", { weight: 60, reps: 8 });
    expect(logRes?.isPr).toBe(true);

    const updateRes = await activeWorkoutStore.updateSet("s1", { weight: 70 });
    expect(updateRes?.set.weight).toBe(70);

    await activeWorkoutStore.deleteSet("s1");
    await activeWorkoutStore.finishWorkout("Great session");

    expect(activeWorkoutStore.workout).toBeNull();
  });
});
