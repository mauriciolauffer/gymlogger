import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../App.vue";
import { router } from "../router";
import { authStore } from "../store/auth";

describe("App Shell", () => {
  it("renders shellbar and route views", async () => {
    authStore.setAuth("token_app", { id: "u1", email: "test@example.com" });
    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });

    router.push("/workouts");
    await router.isReady();

    expect(wrapper.find("ui5-shellbar").attributes("primary-title")).toBe("GymLogger");
  });
});
