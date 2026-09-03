import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import RestTimer from "../RestTimer.vue";
import { activeWorkoutStore } from "../../store/activeWorkout";

describe("RestTimer", () => {
  it("renders remaining rest time when active", () => {
    activeWorkoutStore.startRestTimer(45);

    const wrapper = mount(RestTimer);
    expect(wrapper.text()).toContain("00:45");
  });

  it("stops rest timer on skip click", async () => {
    activeWorkoutStore.startRestTimer(45);
    const wrapper = mount(RestTimer);

    const button = wrapper.find("ui5-button");
    expect(button.exists()).toBe(true);
    await button.trigger("click");
    expect(activeWorkoutStore.restTimer.active).toBe(false);
  });
});
