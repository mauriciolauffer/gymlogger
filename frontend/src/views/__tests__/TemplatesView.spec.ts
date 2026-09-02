import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import TemplatesView from "../TemplatesView.vue";

const mockPush = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("TemplatesView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
  });

  it("fetches, creates, edits, deletes and starts workout from template", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url, opts) => {
      if (opts?.method === "DELETE") {
        return Promise.resolve({ ok: true, json: async () => ({ message: "Deleted" }) });
      }
      if (url.includes("/start")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            workout: { id: "w_tpl", title: "Push Workout", start_time: new Date().toISOString(), total_volume: 0, set_count: 0, exercises: [] },
          }),
        });
      }
      if (url.includes("/workout-templates/t1")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            template: { id: "t1", title: "Push Workout", exercise_count: 4, notes: "Chest & shoulders" },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          templates: [
            { id: "t1", title: "Push Workout", exercise_count: 4, notes: "Chest & shoulders" },
          ],
        }),
      });
    }));

    const wrapper = mount(TemplatesView);
    await new Promise((r) => setTimeout(r, 50));

    expect(wrapper.text()).toContain("Workout Templates");

    const headerBtn = wrapper.find(".header-actions ui5-button");
    await headerBtn.trigger("click");
    expect(wrapper.findComponent({ name: "TemplateEditorModal" }).props("open")).toBe(true);

    const cardBtns = wrapper.findAll(".card-actions ui5-button");
    await cardBtns[1].trigger("click"); // Edit
    await new Promise((r) => setTimeout(r, 50));

    await cardBtns[2].trigger("click"); // Delete
    await new Promise((r) => setTimeout(r, 50));

    await cardBtns[0].trigger("click"); // Start workout
    await new Promise((r) => setTimeout(r, 50));
    expect(mockPush).toHaveBeenCalledWith("/active-workout");
  });
});
