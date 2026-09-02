import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import TemplateEditorModal from "../TemplateEditorModal.vue";

describe("TemplateEditorModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches exercises and handles template save", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url, opts) => {
      if (opts?.method === "POST" || opts?.method === "PUT") {
        return Promise.resolve({ ok: true, json: async () => ({ template: { id: "t1" } }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ exercises: [{ id: "ex1", name: "Squat" }] }),
      });
    }));

    const mockTemplate = {
      id: "t1",
      title: "Leg Day Template",
      notes: "Legs",
      exercises: [{ exercise_id: "ex1", name: "Squat" }],
    };

    const wrapper = mount(TemplateEditorModal, {
      props: { open: true, template: mockTemplate },
    });

    await new Promise((r) => setTimeout(r, 50));

    const buttons = wrapper.findAll("ui5-button");
    // Find save button
    const saveBtn = buttons.find((b) => b.text().includes("Save")) || buttons[buttons.length - 1];
    await saveBtn.trigger("click");

    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.emitted("saved")).toBeTruthy();
  });
});
