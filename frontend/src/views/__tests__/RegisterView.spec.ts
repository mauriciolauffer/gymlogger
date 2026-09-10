import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import RegisterView from "../RegisterView.vue";
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
      signUp: {
        email: vi.fn(),
      },
    },
  };
});

import { authClient } from "../../store/auth";

describe("RegisterView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStore.clearAuth();
    mockPush.mockClear();
  });

  it("renders registration form", () => {
    const wrapper = mount(RegisterView);

    expect(wrapper.find("ui5-input#email-input").exists()).toBe(true);
    expect(wrapper.find("ui5-input#password-input").exists()).toBe(true);
    expect(wrapper.find("ui5-input#confirm-password-input").exists()).toBe(true);
  });

  it("handles successful registration and navigates", async () => {
    vi.mocked(authClient.signUp.email).mockResolvedValue({
      data: { user: { id: "u2", email: "new@example.com", name: "New Athlete" } } as any,
      error: null,
    });

    const wrapper = mount(RegisterView);

    const nameInput = wrapper.find("ui5-input#name-input");
    (nameInput.element as HTMLInputElement).value = "New Athlete";
    await nameInput.trigger("input");

    const emailInput = wrapper.find("ui5-input#email-input");
    (emailInput.element as HTMLInputElement).value = "new@example.com";
    await emailInput.trigger("input");

    const passwordInput = wrapper.find("ui5-input#password-input");
    (passwordInput.element as HTMLInputElement).value = "secret123";
    await passwordInput.trigger("input");

    const confirmInput = wrapper.find("ui5-input#confirm-password-input");
    (confirmInput.element as HTMLInputElement).value = "secret123";
    await confirmInput.trigger("input");

    await wrapper
      .findAll("ui5-button")
      .find((b) => b.text().includes("Register"))!
      .trigger("click");
    await flushPromises();

    expect(mockPush).toHaveBeenCalledWith("/workouts");
  });

  it("shows error when email or password is empty", async () => {
    const wrapper = mount(RegisterView);

    await wrapper
      .findAll("ui5-button")
      .find((b) => b.text().includes("Register"))!
      .trigger("click");

    expect(wrapper.text()).toContain("Email and password are required.");
  });

  it("shows error when password is too short", async () => {
    const wrapper = mount(RegisterView);

    const emailInput = wrapper.find("ui5-input#email-input");
    (emailInput.element as HTMLInputElement).value = "test@example.com";
    await emailInput.trigger("input");

    const passwordInput = wrapper.find("ui5-input#password-input");
    (passwordInput.element as HTMLInputElement).value = "123";
    await passwordInput.trigger("input");

    await wrapper
      .findAll("ui5-button")
      .find((b) => b.text().includes("Register"))!
      .trigger("click");

    expect(wrapper.text()).toContain("Password must be at least 8 characters long.");
  });

  it("shows error when passwords do not match", async () => {
    const wrapper = mount(RegisterView);

    const emailInput = wrapper.find("ui5-input#email-input");
    (emailInput.element as HTMLInputElement).value = "test@example.com";
    await emailInput.trigger("input");

    const passwordInput = wrapper.find("ui5-input#password-input");
    (passwordInput.element as HTMLInputElement).value = "secret123";
    await passwordInput.trigger("input");

    const confirmInput = wrapper.find("ui5-input#confirm-password-input");
    (confirmInput.element as HTMLInputElement).value = "diff1234";
    await confirmInput.trigger("input");

    await wrapper
      .findAll("ui5-button")
      .find((b) => b.text().includes("Register"))!
      .trigger("click");

    expect(wrapper.text()).toContain("Passwords do not match.");
  });

  it("navigates to login page on login button click", async () => {
    const wrapper = mount(RegisterView);

    await wrapper
      .findAll("ui5-button")
      .find((b) => b.text().includes("Log In"))!
      .trigger("click");

    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});
