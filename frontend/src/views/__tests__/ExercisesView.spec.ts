import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import ExercisesView from "../ExercisesView.vue";

describe("ExercisesView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches, searches, filters exercises and opens detail modal", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url) => {
      if (url.includes("/muscle-groups")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ muscleGroups: [{ id: "mg1", name: "Chest" }] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          exercises: [
            { id: "e1", name: "Bench Press", category: "barbell", primary_muscle_name: "Chest" },
          ],
        }),
      });
    }));

    const wrapper = mount(ExercisesView);
    await new Promise((r) => setTimeout(r, 50));

    expect(wrapper.text()).toContain("Exercise Library");
    expect(wrapper.text()).toContain("Bench Press");

    const searchInput = wrapper.find("ui5-input.search-input");
    (searchInput.element as any).value = "Bench";
    await searchInput.trigger("input");

    const createBtn = wrapper.find("ui5-button");
    await createBtn.trigger("click");
    expect(wrapper.findComponent({ name: "CreateExerciseModal" }).props("open")).toBe(true);

    const listItem = wrapper.find("ui5-list-item-standard");
    await listItem.trigger("click");
    expect(wrapper.findComponent({ name: "ExerciseDetailModal" }).props("open")).toBe(true);
  });
});
