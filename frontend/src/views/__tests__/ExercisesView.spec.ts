import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ExercisesView from "../ExercisesView.vue";

const makeFetch = () =>
  vi.fn<typeof fetch>().mockImplementation((url: string) => {
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
          { id: "e1", name: "Bench Press", category: "barbell", muscleGroupName: "Chest" },
        ],
      }),
    });
  });

describe("ExercisesView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the exercise library title", async () => {
    vi.stubGlobal("fetch", makeFetch());
    const wrapper = mount(ExercisesView);
    await flushPromises();

    expect(wrapper.text()).toContain("Exercise Library");
  });

  it("displays exercises after fetch", async () => {
    vi.stubGlobal("fetch", makeFetch());
    const wrapper = mount(ExercisesView);
    await flushPromises();

    expect(wrapper.text()).toContain("Bench Press");
  });

  it("opens create exercise modal on button click", async () => {
    vi.stubGlobal("fetch", makeFetch());
    const wrapper = mount(ExercisesView);
    await flushPromises();

    const createBtn = wrapper
      .findAll("ui5-button")
      .find((b) => b.text().includes("Create Custom Exercise"));
    await createBtn!.trigger("click");

    expect(wrapper.findComponent({ name: "CreateExerciseModal" }).props("open")).toBe(true);
  });

  it("opens exercise detail modal on list item click", async () => {
    vi.stubGlobal("fetch", makeFetch());
    const wrapper = mount(ExercisesView);
    await flushPromises();

    await wrapper.find("ui5-list-item-standard").trigger("click");

    expect(wrapper.findComponent({ name: "ExerciseDetailModal" }).props("open")).toBe(true);
  });

  it("shows empty state when no exercises match filters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/muscle-groups")) {
          return Promise.resolve({ ok: true, json: async () => ({ muscleGroups: [] }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ exercises: [] }) });
      }),
    );
    const wrapper = mount(ExercisesView);
    await flushPromises();

    expect(wrapper.text()).toContain("No exercises found");
  });

  it("re-fetches exercises on search input", async () => {
    const fetchMock = makeFetch();
    vi.stubGlobal("fetch", fetchMock);
    const wrapper = mount(ExercisesView);
    await flushPromises();

    const callsBefore = fetchMock.mock.calls.length;

    const searchInput = wrapper.find("ui5-input.search-input");
    (searchInput.element as HTMLInputElement).value = "Bench";
    await searchInput.trigger("input");
    await flushPromises();

    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
