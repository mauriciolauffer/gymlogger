import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import LoginView from "../LoginView.vue";
import { authStore } from "../../store/auth";

const mockPush = vi.fn<() => void>();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("LoginView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the login form", () => {
    const wrapper = mount(LoginView);

    expect(wrapper.find("ui5-input#email-input").exists()).toBe(true);
    expect(wrapper.find("ui5-input#password-input").exists()).toBe(true);
  });

  it("handles successful login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: "token123", user: { id: "u1", email: "athlete@example.com" } }),
      }),
    );

    const wrapper = mount(LoginView);

    const emailInput = wrapper.find("ui5-input#email-input");
    (emailInput.element as HTMLInputElement).value = "athlete@example.com";
    await emailInput.trigger("input");

    const passwordInput = wrapper.find("ui5-input#password-input");
    (passwordInput.element as HTMLInputElement).value = "password123";
    await passwordInput.trigger("input");

    await wrapper
      .findAll("ui5-button")
      .find((b) => b.text().includes("Log In"))!
      .trigger("click");
    await flushPromises();

    expect(authStore.token).toBe("token123");
    expect(mockPush).toHaveBeenCalledWith("/workouts");
  });

  it("shows validation error when fields are empty", async () => {
    const wrapper = mount(LoginView);

    await wrapper
      .findAll("ui5-button")
      .find((b) => b.text().includes("Log In"))!
      .trigger("click");

    expect(wrapper.text()).toContain("Please enter both email and password.");
  });

  it("shows server error on failed login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Invalid credentials" }),
      }),
    );

    const wrapper = mount(LoginView);

    const emailInput = wrapper.find("ui5-input#email-input");
    (emailInput.element as HTMLInputElement).value = "test@example.com";
    await emailInput.trigger("input");

    const passwordInput = wrapper.find("ui5-input#password-input");
    (passwordInput.element as HTMLInputElement).value = "wrong";
    await passwordInput.trigger("input");

    await wrapper
      .findAll("ui5-button")
      .find((b) => b.text().includes("Log In"))!
      .trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Invalid credentials");
  });

  it("navigates to register page on register button click", async () => {
    const wrapper = mount(LoginView);

    await wrapper
      .findAll("ui5-button")
      .find((b) => b.text().includes("Register"))!
      .trigger("click");

    expect(mockPush).toHaveBeenCalledWith("/register");
  });
});
