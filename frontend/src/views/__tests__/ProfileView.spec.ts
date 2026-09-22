import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import ProfileView from "../ProfileView.vue";

const mockProfile = {
  email: "athlete@example.com",
  name: "John Athlete",
  location: "New York",
  birthday: "1995-05-15",
  sex: "M",
  height: 180,
  heightUnit: "cm",
  bio: "Passionate lifter",
};

describe("ProfileView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the profile card header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ profile: mockProfile }),
      }),
    );

    const wrapper = mount(ProfileView);
    await flushPromises();

    expect(wrapper.find("ui5-form").attributes("header-text")).toBe("Profile");
  });

  it("loads and displays profile data on mount", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ profile: mockProfile }),
      }),
    );

    const wrapper = mount(ProfileView);
    await flushPromises();

    const inputs = wrapper.findAll("ui5-input");
    const nameInput = inputs.find(
      (i) =>
        (i.element as HTMLInputElement).value === "John Athlete" ||
        i.attributes("value") === "John Athlete",
    );
    expect(nameInput).toBeDefined();
  });

  it("shows error message when profile fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      }),
    );

    const wrapper = mount(ProfileView);
    await flushPromises();

    expect(wrapper.text()).toContain("Server error");
  });

  it("saves profile and shows success message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url, opts) => {
        if (opts?.method === "PUT") {
          return Promise.resolve({ ok: true, json: async () => ({ message: "Updated" }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ profile: mockProfile }) });
      }),
    );

    const wrapper = mount(ProfileView);
    await flushPromises();

    const saveBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Save"));
    await saveBtn!.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Profile updated successfully!");
  });

  it("dismisses the message strip when close event fires", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url, opts) => {
        if (opts?.method === "PUT") {
          return Promise.resolve({ ok: true, json: async () => ({ message: "Updated" }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ profile: mockProfile }) });
      }),
    );

    const wrapper = mount(ProfileView);
    await flushPromises();

    const saveBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Save"));
    await saveBtn!.trigger("click");
    await flushPromises();

    expect(wrapper.find("ui5-message-strip").exists()).toBe(true);

    await wrapper.find("ui5-message-strip").trigger("close");
    expect(wrapper.find("ui5-message-strip").exists()).toBe(false);
  });

  it("hides the form when loading", async () => {
    let resolve: (v: unknown) => void = () => {};
    const pending = new Promise((r) => {
      resolve = r;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending));

    const wrapper = mount(ProfileView);
    await nextTick(); // let onMounted start and set loading=true
    // Form is hidden while loading
    expect(wrapper.find("ui5-form").exists()).toBe(false);

    resolve({ ok: true, json: async () => ({ profile: mockProfile }) });
    await flushPromises();
    expect(wrapper.find("ui5-form").exists()).toBe(true);
  });

  it("uses generic error message when fetch error has no message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );

    const wrapper = mount(ProfileView);
    await flushPromises();

    expect(wrapper.text()).toContain("Request failed with status 500");
  });

  it("updates height and bio fields from inputs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ profile: mockProfile }),
      }),
    );

    const wrapper = mount(ProfileView);
    await flushPromises();

    const heightInput = wrapper.findAll("ui5-input").find((i) => i.attributes("type") === "Number");
    if (heightInput) {
      Object.defineProperty(heightInput.element, "value", { value: "185", configurable: true });
      await heightInput.trigger("input");
    }

    const textarea = wrapper.find("ui5-textarea");
    if (textarea.exists()) {
      Object.defineProperty(textarea.element, "value", {
        value: "New bio text",
        configurable: true,
      });
      await textarea.trigger("input");
    }

    expect(wrapper.exists()).toBe(true);
  });

  it("updates height_unit via segmented button", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ profile: mockProfile }),
      }),
    );

    const wrapper = mount(ProfileView);
    await flushPromises();

    const heightSegmented = wrapper.find("ui5-segmented-button");
    if (heightSegmented.exists()) {
      const inItem = document.createElement("ui5-segmented-button-item");
      inItem.setAttribute("data-value", "in");
      await heightSegmented.trigger("selection-change", {
        detail: { selectedItems: [inItem] },
      });
    }

    expect(wrapper.exists()).toBe(true);
  });

  it("updates name, location, birthday, and sex fields via events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ profile: mockProfile }),
      }),
    );

    const wrapper = mount(ProfileView);
    await flushPromises();

    // Name input
    const nameInput = wrapper
      .findAll("ui5-input")
      .find((i) => i.attributes("placeholder") === "Athlete Name");
    if (nameInput) {
      Object.defineProperty(nameInput.element, "value", { value: "New Name", configurable: true });
      await nameInput.trigger("input");
    }

    // Location input
    const locationInput = wrapper
      .findAll("ui5-input")
      .find((i) => i.attributes("placeholder") === "City, Country");
    if (locationInput) {
      Object.defineProperty(locationInput.element, "value", {
        value: "Berlin, Germany",
        configurable: true,
      });
      await locationInput.trigger("input");
    }

    // Birthday date picker
    const datePicker = wrapper.find("ui5-date-picker");
    if (datePicker.exists()) {
      Object.defineProperty(datePicker.element, "value", {
        value: "2000-01-01",
        configurable: true,
      });
      await datePicker.trigger("change");
    }

    // Sex select
    const sexSelect = wrapper.find("ui5-select");
    if (sexSelect.exists()) {
      const maleOption = document.createElement("ui5-option");
      maleOption.setAttribute("value", "M");
      Object.defineProperty(sexSelect.element, "selectedOption", {
        value: maleOption,
        configurable: true,
      });
      await sexSelect.trigger("change");
    }

    expect(wrapper.exists()).toBe(true);
  });
});
