import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import WorkoutHistoryView from "../WorkoutHistoryView.vue";

const mockPush = vi.fn<() => void>();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockRes = (body: unknown) => Promise.resolve(body as unknown as Response);

const workoutList = [
  {
    id: "w1",
    title: "Upper Body Hypertrophy",
    startTime: "2026-01-01T10:00:00Z",
    durationSeconds: 2700,
    totalVolume: 8500,
  },
];

const makeFetch = (overrides?: (url: string | Request | URL, opts?: RequestInit) => unknown) =>
  vi.fn<typeof fetch>().mockImplementation((url: string | Request | URL, opts?: RequestInit) => {
    const result = overrides?.(url, opts);
    if (result !== undefined) return result as Promise<Response>;
    if (opts?.method === "DELETE") {
      return mockRes({ ok: true, json: async () => ({ message: "Deleted" }) });
    }
    if (String(url).includes("/start")) {
      return mockRes({
        ok: true,
        json: async () => ({
          workout: {
            id: "w_new",
            title: "Empty Session",
            startTime: new Date().toISOString(),
            totalVolume: 0,
            setCount: 0,
            exercises: [],
          },
        }),
      });
    }
    if (String(url).includes("/workouts/w1")) {
      return mockRes({
        ok: true,
        json: async () => ({
          workout: { id: "w1", title: "Upper Body Hypertrophy", exercises: [] },
        }),
      });
    }
    return mockRes({ ok: true, json: async () => ({ workouts: workoutList }) });
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

  it("renders formatted duration and total volume from camelCase API fields", async () => {
    vi.stubGlobal("fetch", makeFetch());
    const wrapper = mount(WorkoutHistoryView);
    await flushPromises();

    const item = wrapper.find("ui5-list-item-standard");
    const description = item.attributes("description") ?? "";
    expect(description).toContain("45m");
    expect(description).toContain("8500");
  });
});
