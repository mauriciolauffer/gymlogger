import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import MeasurementsView from "../MeasurementsView.vue";

const mockMeasurement = {
  id: "m1",
  created_at: "2026-01-01T10:00:00Z",
  weight: 78.5,
  weight_unit: "kg",
  body_fat_pct: 14.5,
  waist: 82,
  length_unit: "cm",
  photo_url: "https://example.com/photo.jpg",
};

describe("MeasurementsView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the page title", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ measurements: [mockMeasurement] }),
      }),
    );

    const wrapper = mount(MeasurementsView);
    await flushPromises();

    expect(wrapper.text()).toContain("Body Measurements & Progress");
  });

  it("displays measurement entries after fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ measurements: [mockMeasurement] }),
      }),
    );

    const wrapper = mount(MeasurementsView);
    await flushPromises();

    expect(wrapper.find(".progress-photo").exists()).toBe(true);
  });

  it("opens log measurement modal on button click", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ measurements: [] }),
      }),
    );

    const wrapper = mount(MeasurementsView);
    await flushPromises();

    const logBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Log Measurement"));
    await logBtn!.trigger("click");

    expect(wrapper.findComponent({ name: "LogMeasurementModal" }).props("open")).toBe(true);
  });

  it("shows loading state while fetching", async () => {
    let resolve: (value: unknown) => void = () => {};
    const pendingFetch = new Promise((r) => {
      resolve = r;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pendingFetch));

    const wrapper = mount(MeasurementsView);
    await nextTick(); // let onMounted start and set loading=true
    expect(wrapper.text()).toContain("Loading measurements");

    resolve({
      ok: true,
      json: async () => ({ measurements: [] }),
    });
    await flushPromises();
    expect(wrapper.text()).not.toContain("Loading measurements");
  });

  it("calls delete API and refetches on confirm", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ measurements: [mockMeasurement] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mount(MeasurementsView);
    await flushPromises();

    const deleteBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Delete"));
    await deleteBtn!.trigger("click");
    await flushPromises();

    // Called once on mount, once on DELETE, once after delete to refetch
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it("does not delete when confirm is cancelled", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ measurements: [mockMeasurement] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mount(MeasurementsView);
    await flushPromises();

    const callCountBefore = fetchMock.mock.calls.length;
    const deleteBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Delete"));
    await deleteBtn!.trigger("click");
    await flushPromises();

    // No additional fetch calls (no delete + no refetch)
    expect(fetchMock.mock.calls.length).toBe(callCountBefore);
  });

  it("displays formatted metrics including body fat and waist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ measurements: [mockMeasurement] }),
      }),
    );

    const wrapper = mount(MeasurementsView);
    await flushPromises();

    const card = wrapper.find("ui5-card-header");
    const subtitle = card.attributes("subtitle-text") ?? "";
    expect(subtitle).toContain("Weight:");
    expect(subtitle).toContain("Body Fat:");
    expect(subtitle).toContain("Waist:");
  });

  it("refetches measurements when LogMeasurementModal emits saved", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ measurements: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mount(MeasurementsView);
    await flushPromises();

    const callsBefore = fetchMock.mock.calls.length;
    wrapper.findComponent({ name: "LogMeasurementModal" }).vm.$emit("saved");
    await flushPromises();

    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
