import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import WorkoutExerciseCard from "../WorkoutExerciseCard.vue";

const exercise = {
  id: "we1",
  workoutId: "w1",
  exerciseId: "ex1",
  exerciseName: "Squat",
  orderIndex: 0,
  sets: [
    {
      id: "s1",
      workoutExerciseId: "we1",
      setType: "NO",
      weight: 100,
      weightUnit: "kg",
      reps: 5,
      orderIndex: 0,
    },
    {
      id: "s2",
      workoutExerciseId: "we1",
      setType: "WU",
      weight: 60,
      weightUnit: "kg",
      reps: 10,
      orderIndex: 1,
    },
  ],
  previousSets: [
    {
      id: "ps1",
      workoutExerciseId: "we_old",
      setType: "NO",
      weight: 90,
      weightUnit: "kg",
      reps: 5,
      orderIndex: 0,
    },
  ],
};

describe("WorkoutExerciseCard", () => {
  it("renders exercise name and 1-based index in the card header", () => {
    const wrapper = mount(WorkoutExerciseCard, { props: { exercise, index: 2 } });

    const header = wrapper.find("ui5-card-header");
    expect(header.attributes("title-text")).toContain("Squat");
    expect(header.attributes("title-text")).toContain("3.");
  });

  it("renders a row for each set", () => {
    const wrapper = mount(WorkoutExerciseCard, { props: { exercise, index: 0 } });

    const rows = wrapper.findAll(".table-row");
    expect(rows).toHaveLength(2);
  });

  it("displays previous session reference chips", () => {
    const wrapper = mount(WorkoutExerciseCard, { props: { exercise, index: 0 } });

    expect(wrapper.text()).toContain("Last Session:");
    expect(wrapper.find(".ref-chip").text()).toContain("90kg");
  });

  it("does not render previous-reference section when previousSets is empty", () => {
    const wrapper = mount(WorkoutExerciseCard, {
      props: { exercise: { ...exercise, previousSets: [] }, index: 0 },
    });

    expect(wrapper.find(".previous-reference").exists()).toBe(false);
  });

  it("emits add-set with the exercise id when + Add Set is clicked", async () => {
    const wrapper = mount(WorkoutExerciseCard, { props: { exercise, index: 0 } });

    const addSetBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Add Set"));
    await addSetBtn!.trigger("click");

    expect(wrapper.emitted("add-set")).toHaveLength(1);
    expect(wrapper.emitted("add-set")![0]).toEqual(["we1"]);
  });

  it("emits delete-set with the set id when delete button is clicked", async () => {
    const wrapper = mount(WorkoutExerciseCard, { props: { exercise, index: 0 } });

    const deleteBtn = wrapper.findAll(".row-actions ui5-button")[0];
    await deleteBtn.trigger("click");

    expect(wrapper.emitted("delete-set")).toHaveLength(1);
    expect(wrapper.emitted("delete-set")![0]).toEqual(["s1"]);
  });

  it("emits update-set-weight when weight input changes", async () => {
    const wrapper = mount(WorkoutExerciseCard, { props: { exercise, index: 0 } });

    const weightInput = wrapper.findAll(".num-input")[0];
    (weightInput.element as HTMLInputElement).value = "110";
    await weightInput.trigger("change");

    expect(wrapper.emitted("update-set-weight")).toHaveLength(1);
    expect(wrapper.emitted("update-set-weight")![0]).toEqual(["s1", 110]);
  });

  it("emits update-set-reps when reps input changes", async () => {
    const wrapper = mount(WorkoutExerciseCard, { props: { exercise, index: 0 } });

    const repsInput = wrapper.findAll(".num-input")[1];
    (repsInput.element as HTMLInputElement).value = "8";
    await repsInput.trigger("change");

    expect(wrapper.emitted("update-set-reps")).toHaveLength(1);
    expect(wrapper.emitted("update-set-reps")![0]).toEqual(["s1", 8]);
  });

  it("emits open-warmup with the first set weight when Warmup Calc is clicked", async () => {
    const wrapper = mount(WorkoutExerciseCard, { props: { exercise, index: 0 } });

    const warmupBtn = wrapper.find("ui5-card-header ui5-button");
    await warmupBtn.trigger("click");

    expect(wrapper.emitted("open-warmup")).toHaveLength(1);
    expect(wrapper.emitted("open-warmup")![0]).toEqual([100]);
  });

  it("falls back to 100 for open-warmup when no sets exist", async () => {
    const wrapper = mount(WorkoutExerciseCard, {
      props: { exercise: { ...exercise, sets: [] }, index: 0 },
    });

    const warmupBtn = wrapper.find("ui5-card-header ui5-button");
    await warmupBtn.trigger("click");

    expect(wrapper.emitted("open-warmup")![0]).toEqual([100]);
  });
});
