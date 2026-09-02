import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import CreateExerciseModal from "../CreateExerciseModal.vue";

describe("CreateExerciseModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles custom exercise creation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ exercise: { id: "ex_custom", name: "Incline Cable Fly" } }),
    }));

    const wrapper = mount(CreateExerciseModal, {
      props: {
        open: true,
        muscleGroups: [{ id: "mg1", name: "Chest" }],
      },
    });

    const input = wrapper.find("ui5-input");
    (input.element as any).value = "Incline Cable Fly";
    await input.trigger("input");

    const buttons = wrapper.findAll("ui5-button");
    await buttons[1].trigger("click");

    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.emitted("created")).toBeTruthy();
  });
});
