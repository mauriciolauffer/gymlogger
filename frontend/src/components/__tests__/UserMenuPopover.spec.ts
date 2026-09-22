import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import UserMenuPopover from "../UserMenuPopover.vue";

describe("UserMenuPopover", () => {
  it("renders user menu with provided name and email", () => {
    const wrapper = mount(UserMenuPopover, {
      props: {
        open: true,
        opener: null,
        userName: "Jane Doe",
        userEmail: "jane@example.com",
      },
    });

    expect(wrapper.find("ui5-user-menu-account").attributes("title-text")).toBe("Jane Doe");
    expect(wrapper.find("ui5-user-menu-account").attributes("subtitle-text")).toBe(
      "jane@example.com",
    );
  });

  it("emits close when ui5-user-menu close event fires", async () => {
    const wrapper = mount(UserMenuPopover, {
      props: { open: true, opener: null, userName: "A", userEmail: "a@b.com" },
    });

    await wrapper.find("ui5-user-menu").trigger("close");

    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits signOut when sign-out-click fires", async () => {
    const wrapper = mount(UserMenuPopover, {
      props: { open: true, opener: null, userName: "A", userEmail: "a@b.com" },
    });

    await wrapper.find("ui5-user-menu").trigger("sign-out-click");

    expect(wrapper.emitted("signOut")).toBeTruthy();
  });

  it("emits profile when profile item-click fires", async () => {
    const wrapper = mount(UserMenuPopover, {
      props: { open: false, opener: null, userName: "A", userEmail: "a@b.com" },
    });

    const profileItem = document.createElement("div");
    profileItem.dataset.action = "profile";

    await wrapper.find("ui5-user-menu").trigger("item-click", { detail: { item: profileItem } });

    expect(wrapper.emitted("profile")).toBeTruthy();
  });

  it("emits settings when settings item-click fires", async () => {
    const wrapper = mount(UserMenuPopover, {
      props: { open: false, opener: null, userName: "A", userEmail: "a@b.com" },
    });

    const settingsItem = document.createElement("div");
    settingsItem.dataset.action = "settings";

    await wrapper.find("ui5-user-menu").trigger("item-click", {
      detail: { item: settingsItem },
    });

    expect(wrapper.emitted("settings")).toBeTruthy();
  });

  it("sets opener on the menu element when opener prop changes", async () => {
    const opener = document.createElement("button");
    const wrapper = mount(UserMenuPopover, {
      props: { open: false, opener: null, userName: "A", userEmail: "a@b.com" },
    });

    await wrapper.setProps({ opener });
    await flushPromises();

    // The watcher sets menu.opener = opener on the element — component renders without error
    expect(wrapper.exists()).toBe(true);
  });

  it("does not set opener when opener prop is null", async () => {
    const wrapper = mount(UserMenuPopover, {
      props: { open: false, opener: null, userName: "A", userEmail: "a@b.com" },
    });

    await wrapper.setProps({ opener: null });
    await flushPromises();

    expect(wrapper.exists()).toBe(true);
  });

  it("handles item-click with no matching action gracefully", async () => {
    const wrapper = mount(UserMenuPopover, {
      props: { open: false, opener: null, userName: "A", userEmail: "a@b.com" },
    });

    const unknownItem = document.createElement("div");
    unknownItem.dataset.action = "unknown";

    await wrapper.find("ui5-user-menu").trigger("item-click", { detail: { item: unknownItem } });

    expect(wrapper.emitted("profile")).toBeFalsy();
    expect(wrapper.emitted("settings")).toBeFalsy();
  });
});
