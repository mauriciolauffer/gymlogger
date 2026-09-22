import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import WorkoutDetailModal from "../WorkoutDetailModal.vue";

describe("WorkoutDetailModal", () => {
  it("displays workout exercises and sets details", () => {
    const mockWorkout = {
      title: "Chest & Triceps",
      startTime: "2026-01-01T10:00:00Z",
      durationSeconds: 3600,
      totalVolume: 5000,
      exercises: [
        {
          id: "we1",
          exerciseName: "Bench Press",
          sets: [{ id: "s1", weight: 100, weightUnit: "kg", reps: 5, setType: "NO" }],
        },
      ],
    };

    const wrapper = mount(WorkoutDetailModal, {
      props: {
        open: true,
        workout: mockWorkout,
      },
    });

    expect(wrapper.find("ui5-dialog").attributes("header-text")).toBe("Chest & Triceps");
    expect(wrapper.text()).toContain("Bench Press");
    expect(wrapper.text()).toContain("100 kg × 5 reps");
  });
});
