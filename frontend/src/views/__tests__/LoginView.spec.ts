import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import LoginView from "../LoginView.vue";
import { authStore } from "../../store/auth";

const mockPush = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("LoginView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders login form elements and handles successful login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "token123", user: { id: "u1", email: "athlete@example.com" } }),
    }));

    const wrapper = mount(LoginView);

    const inputs = wrapper.findAll("ui5-input");
    (inputs[0].element as any).value = "athlete@example.com";
    await inputs[0].trigger("input");

    (inputs[1].element as any).value = "password123";
    await inputs[1].trigger("input");

    const buttons = wrapper.findAll("ui5-button");
    await buttons[0].trigger("click");

    await new Promise((r) => setTimeout(r, 50));

    expect(authStore.token).toBe("token123");
    expect(mockPush).toHaveBeenCalledWith("/workouts");
  });

  it("displays error message on invalid input or login failure", async () => {
    const wrapper = mount(LoginView);
    const buttons = wrapper.findAll("ui5-button");

    const inputs = wrapper.findAll("ui5-input");
    (inputs[0].element as any).value = "";
    await inputs[0].trigger("input");
    (inputs[1].element as any).value = "";
    await inputs[1].trigger("input");

    await buttons[0].trigger("click");
    expect(wrapper.text()).toContain("Please enter both email and password.");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Invalid credentials" }),
    }));

    (inputs[0].element as any).value = "test@example.com";
    await inputs[0].trigger("input");
    (inputs[1].element as any).value = "wrong";
    await inputs[1].trigger("input");

    await buttons[0].trigger("click");

    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.text()).toContain("Invalid credentials");
  });

  it("navigates to register page on register button click", async () => {
    const wrapper = mount(LoginView);
    const buttons = wrapper.findAll("ui5-button");

    await buttons[1].trigger("click");
    expect(mockPush).toHaveBeenCalledWith("/register");
  });
});
