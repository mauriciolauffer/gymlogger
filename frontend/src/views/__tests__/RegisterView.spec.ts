import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import RegisterView from "../RegisterView.vue";
import { authStore } from "../../store/auth";

const mockPush = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("RegisterView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles successful registration", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ token: "token_reg", user: { id: "u2", email: "new@example.com" } }),
    }));

    const wrapper = mount(RegisterView);

    const inputs = wrapper.findAll("ui5-input");
    (inputs[0].element as any).value = "New Athlete";
    await inputs[0].trigger("input");

    (inputs[1].element as any).value = "new@example.com";
    await inputs[1].trigger("input");

    (inputs[2].element as any).value = "secret123";
    await inputs[2].trigger("input");

    (inputs[3].element as any).value = "secret123";
    await inputs[3].trigger("input");

    const buttons = wrapper.findAll("ui5-button");
    await buttons[0].trigger("click");
    await new Promise((r) => setTimeout(r, 50));

    expect(authStore.token).toBe("token_reg");
    expect(mockPush).toHaveBeenCalledWith("/workouts");
  });

  it("validates form inputs", async () => {
    const wrapper = mount(RegisterView);
    const buttons = wrapper.findAll("ui5-button");
    const inputs = wrapper.findAll("ui5-input");

    await buttons[0].trigger("click");
    expect(wrapper.text()).toContain("Email and password are required.");

    (inputs[1].element as any).value = "test@example.com";
    await inputs[1].trigger("input");
    (inputs[2].element as any).value = "123";
    await inputs[2].trigger("input");
    await buttons[0].trigger("click");
    expect(wrapper.text()).toContain("Password must be at least 6 characters long.");

    (inputs[2].element as any).value = "secret123";
    await inputs[2].trigger("input");
    (inputs[3].element as any).value = "diff1234";
    await inputs[3].trigger("input");
    await buttons[0].trigger("click");
    expect(wrapper.text()).toContain("Passwords do not match.");
  });

  it("navigates to login page on click", async () => {
    const wrapper = mount(RegisterView);
    const buttons = wrapper.findAll("ui5-button");
    await buttons[1].trigger("click");
    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});
