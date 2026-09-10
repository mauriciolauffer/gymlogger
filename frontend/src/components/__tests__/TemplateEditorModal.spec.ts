import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import TemplateEditorModal from "../TemplateEditorModal.vue";

const mockTemplate = {
  id: "t1",
  title: "Leg Day Template",
  notes: "Legs",
  exercises: [{ exercise_id: "ex1", name: "Squat" }],
};

describe("TemplateEditorModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("emits 'saved' after successful template save", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
        if (opts?.method === "POST" || opts?.method === "PUT") {
          return Promise.resolve({ ok: true, json: async () => ({ template: { id: "t1" } }) });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ exercises: [{ id: "ex1", name: "Squat" }] }),
        });
      }),
    );

    const wrapper = mount(TemplateEditorModal, {
      props: { open: true, template: mockTemplate },
    });
    await flushPromises();

    await wrapper
      .findAll("ui5-button")
      .find((b) => b.text().includes("Save"))!
      .trigger("click");
    await flushPromises();

    expect(wrapper.emitted("saved")).toBeTruthy();
  });

  it("emits 'close' when cancel button is clicked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ exercises: [] }),
      }),
    );

    const wrapper = mount(TemplateEditorModal, {
      props: { open: true, template: null },
    });
    await flushPromises();

    await wrapper
      .findAll("ui5-button")
      .find((b) => b.text().includes("Cancel"))!
      .trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
  });
});
