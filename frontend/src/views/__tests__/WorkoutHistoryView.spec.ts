import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import WorkoutHistoryView from "../WorkoutHistoryView.vue";

const mockPush = vi.fn<() => void>();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const workoutList = [
  {
    id: "w1",
    title: "Upper Body Hypertrophy",
    start_time: "2026-01-01T10:00:00Z",
    duration_seconds: 2700,
    total_volume: 8500,
  },
];

const makeFetch = (overrides?: (url: string, opts?: RequestInit) => unknown) =>
  vi.fn<typeof fetch>().mockImplementation((url: string, opts?: RequestInit) => {
    const result = overrides?.(url, opts);
    if (result !== undefined) return result;
    if (opts?.method === "DELETE") {
      return Promise.resolve({ ok: true, json: async () => ({ message: "Deleted" }) });
    }
    if (url.includes("/start")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          workout: {
            id: "w_new",
            title: "Empty Session",
            start_time: new Date().toISOString(),
            total_volume: 0,
            set_count: 0,
            exercises: [],
          },
        }),
      });
    }
    if (url.includes("/workouts/w1")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          workout: { id: "w1", title: "Upper Body Hypertrophy", exercises: [] },
        }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({ workouts: workoutList }) });
  });

describe("WorkoutHistoryView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
  });

  it("renders workout history list", async () => {
    vi.stubGlobal("fetch", makeFetch());
    const wrapper = mount(WorkoutHistoryView);
    await flushPromises();

    expect(wrapper.text()).toContain("Workout History");
    expect(wrapper.text()).toContain("Upper Body Hypertrophy");
  });

  it("opens workout detail modal on list item click", async () => {
    vi.stubGlobal("fetch", makeFetch());
    const wrapper = mount(WorkoutHistoryView);
    await flushPromises();

    await wrapper.find("ui5-list-item-standard").trigger("click");
    await flushPromises();

    expect(wrapper.findComponent({ name: "WorkoutDetailModal" }).props("open")).toBe(true);
  });

  it("deletes a workout on delete button click", async () => {
    const fetchMock = makeFetch();
    vi.stubGlobal("fetch", fetchMock);
    const wrapper = mount(WorkoutHistoryView);
    await flushPromises();

    await wrapper.find("ui5-list-item-standard ui5-button").trigger("click");
    await flushPromises();

    const deleteCalls = (fetchMock.mock.calls as [string, RequestInit][]).filter(
      ([, opts]) => opts?.method === "DELETE",
    );
    expect(deleteCalls).toHaveLength(1);
  });

  it("navigates to active workout on start empty workout click", async () => {
    vi.stubGlobal("fetch", makeFetch());
    const wrapper = mount(WorkoutHistoryView);
    await flushPromises();

    await wrapper.find(".header-actions ui5-button").trigger("click");
    await flushPromises();

    expect(mockPush).toHaveBeenCalledWith("/active-workout");
  });

  it("shows empty state when no workouts exist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ workouts: [] }),
      }),
    );
    const wrapper = mount(WorkoutHistoryView);
    await flushPromises();

    expect(wrapper.text()).toContain("No workout sessions logged yet");
  });
});
