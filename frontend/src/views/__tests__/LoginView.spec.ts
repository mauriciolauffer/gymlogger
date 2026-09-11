import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import LoginView from "../LoginView.vue";
import { authStore } from "../../store/auth";

const mockPush = vi.fn<() => void>();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("../../store/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../store/auth")>();
  return {
    ...original,
    authClient: {
      signIn: {
        email: vi.fn<typeof import("../../store/auth").authClient.signIn.email>(),
      },
    },
  };
});

import { authClient } from "../../store/auth";

describe("LoginView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStore.clearAuth();
    mockPush.mockClear();
  });

  it("renders the login form", () => {
    const wrapper = mount(LoginView);

    expect(wrapper.find("ui5-input#email-input").exists()).toBe(true);
    expect(wrapper.find("ui5-input#password-input").exists()).toBe(true);
  });

  it("handles successful login and navigates", async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({
      data: { user: { id: "u1", email: "athlete@example.com", name: "Athlete" } } as any,
      error: null,
    });

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
    vi.mocked(authClient.signIn.email).mockResolvedValue({
      data: null,
      error: { message: "Invalid email or password" } as any,
    });

    const wrapper = mount(LoginView);

    const emailInput = wrapper.find("ui5-input#email-input");
    (emailInput.element as HTMLInputElement).value = "test@example.com";
    await emailInput.trigger("input");

    const passwordInput = wrapper.find("ui5-input#password-input");
    (passwordInput.element as HTMLInputElement).value = "wrongpass";
    await passwordInput.trigger("input");

    await wrapper
      .findAll("ui5-button")
      .find((b) => b.text().includes("Log In"))!
      .trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Invalid email or password");
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
