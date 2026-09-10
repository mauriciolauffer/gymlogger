import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import CreateExerciseModal from "../CreateExerciseModal.vue";

const muscleGroups = [{ id: "mg1", name: "Chest" }];

describe("CreateExerciseModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("emits 'created' after successful exercise creation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ exercise: { id: "ex_custom", name: "Incline Cable Fly" } }),
      }),
    );

    const wrapper = mount(CreateExerciseModal, {
      props: { open: true, muscleGroups },
    });

    const nameInput = wrapper.find("ui5-input");
    (nameInput.element as HTMLInputElement).value = "Incline Cable Fly";
    await nameInput.trigger("input");

    const createBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Create"));
    await createBtn!.trigger("click");
    await flushPromises();

    expect(wrapper.emitted("created")).toBeTruthy();
  });

  it("shows validation error when name is empty", async () => {
    const wrapper = mount(CreateExerciseModal, {
      props: { open: true, muscleGroups },
    });

    const createBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Create"));
    await createBtn!.trigger("click");

    expect(wrapper.text()).toContain("Exercise name is required.");
  });

  it("emits 'close' when cancel button is clicked", async () => {
    const wrapper = mount(CreateExerciseModal, {
      props: { open: true, muscleGroups },
    });

    const cancelBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Cancel"));
    await cancelBtn!.trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
  });
});
