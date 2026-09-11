import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import TemplatesView from "../TemplatesView.vue";

const mockPush = vi.fn<() => void>();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockTemplate = {
  id: "t1",
  title: "Push Workout",
  exercise_count: 4,
  notes: "Chest & shoulders",
};

const makeFetch = () =>
  vi.fn<typeof fetch>().mockImplementation((url: string, opts?: RequestInit) => {
    if (opts?.method === "DELETE") {
      return Promise.resolve({ ok: true, json: async () => ({ message: "Deleted" }) });
    }
    if (url.includes("/start")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          workout: {
            id: "w_tpl",
            title: "Push Workout",
            start_time: new Date().toISOString(),
            total_volume: 0,
            set_count: 0,
            exercises: [],
          },
        }),
      });
    }
    if (url.includes("/workout-templates/t1")) {
      return Promise.resolve({ ok: true, json: async () => ({ template: mockTemplate }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ templates: [mockTemplate] }) });
  });

describe("TemplatesView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
  });

  it("renders workout templates list", async () => {
    vi.stubGlobal("fetch", makeFetch());
    const wrapper = mount(TemplatesView);
    await flushPromises();

    expect(wrapper.text()).toContain("Workout Templates");
    const header = wrapper.find("ui5-card-header");
    expect(header.attributes("title-text")).toBe("Push Workout");
  });

  it("opens template editor modal on create new click", async () => {
    vi.stubGlobal("fetch", makeFetch());
    const wrapper = mount(TemplatesView);
    await flushPromises();

    await wrapper.find(".header-actions ui5-button").trigger("click");

    expect(wrapper.findComponent({ name: "TemplateEditorModal" }).props("open")).toBe(true);
  });

  it("opens template editor with template data on edit click", async () => {
    vi.stubGlobal("fetch", makeFetch());
    const wrapper = mount(TemplatesView);
    await flushPromises();

    const editBtn = wrapper.find(".card-actions ui5-button[data-action='edit']");
    await editBtn.trigger("click");
    await flushPromises();

    expect(wrapper.findComponent({ name: "TemplateEditorModal" }).props("open")).toBe(true);
  });

  it("deletes template on delete button click", async () => {
    const fetchMock = makeFetch();
    vi.stubGlobal("fetch", fetchMock);
    const wrapper = mount(TemplatesView);
    await flushPromises();

    const deleteBtn = wrapper.find(".card-actions ui5-button[data-action='delete']");
    await deleteBtn.trigger("click");
    await flushPromises();

    const deleteCalls = (fetchMock.mock.calls as [string, RequestInit][]).filter(
      ([, opts]) => opts?.method === "DELETE",
    );
    expect(deleteCalls).toHaveLength(1);
  });

  it("navigates to active workout on start from template click", async () => {
    vi.stubGlobal("fetch", makeFetch());
    const wrapper = mount(TemplatesView);
    await flushPromises();

    const startBtn = wrapper.find(".card-actions ui5-button[data-action='start']");
    await startBtn.trigger("click");
    await flushPromises();

    expect(mockPush).toHaveBeenCalledWith("/active-workout");
  });

  it("shows empty state when no templates exist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ templates: [] }),
      }),
    );
    const wrapper = mount(TemplatesView);
    await flushPromises();

    expect(wrapper.text()).toContain("No workout templates found");
  });
});
