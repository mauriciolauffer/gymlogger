import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import WorkoutDetailModal from "../WorkoutDetailModal.vue";

describe("WorkoutDetailModal", () => {
  it("displays workout exercises and sets details", () => {
    const mockWorkout = {
      title: "Chest & Triceps",
      start_time: "2026-01-01T10:00:00Z",
      duration_seconds: 3600,
      total_volume: 5000,
      exercises: [
        {
          id: "we1",
          exercise_name: "Bench Press",
          sets: [{ id: "s1", weight: 100, reps: 5, set_type: "normal" }],
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
