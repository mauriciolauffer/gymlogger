import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import ProfileView from "../ProfileView.vue";

describe("ProfileView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches, updates and saves profile", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url, opts) => {
      if (opts?.method === "PUT") {
        return Promise.resolve({ ok: true, json: async () => ({ message: "Profile updated" }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          profile: {
            email: "athlete@example.com",
            name: "John Athlete",
            location: "New York",
            birthday: "1995-05-15",
            sex: "male",
            height: 180,
            height_unit: "cm",
            bio: "Passionate lifter",
          },
        }),
      });
    }));

    const wrapper = mount(ProfileView);
    await new Promise((r) => setTimeout(r, 50));

    expect(wrapper.find("ui5-card-header").attributes("title-text")).toBe("User Profile");

    const inputs = wrapper.findAll("ui5-input");
    if (inputs.length > 1) {
      (inputs[1].element as any).value = "Jane Doe";
      await inputs[1].trigger("input");
    }

    const textarea = wrapper.find("ui5-textarea");
    (textarea.element as any).value = "New bio";
    await textarea.trigger("input");

    const saveBtn = wrapper.find("ui5-button");
    await saveBtn.trigger("click");
    await new Promise((r) => setTimeout(r, 50));

    expect(wrapper.text()).toContain("Profile updated successfully!");
  });
});
