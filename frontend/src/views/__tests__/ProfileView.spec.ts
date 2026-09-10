import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ProfileView from "../ProfileView.vue";

const mockProfile = {
  email: "athlete@example.com",
  name: "John Athlete",
  location: "New York",
  birthday: "1995-05-15",
  sex: "male",
  height: 180,
  height_unit: "cm",
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

    expect(wrapper.find("ui5-card-header").attributes("title-text")).toBe("User Profile");
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

  it("shows error message when profile save fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url, opts) => {
        if (opts?.method === "PUT") {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({ error: "Validation failed" }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ profile: mockProfile }) });
      }),
    );

    const wrapper = mount(ProfileView);
    await flushPromises();

    const saveBtn = wrapper.findAll("ui5-button").find((b) => b.text().includes("Save"));
    await saveBtn!.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Validation failed");
  });
});
