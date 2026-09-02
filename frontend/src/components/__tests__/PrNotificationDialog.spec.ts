import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PrNotificationDialog from "../PrNotificationDialog.vue";

describe("PrNotificationDialog", () => {
  it("renders PR types and emits close event on click", async () => {
    const wrapper = mount(PrNotificationDialog, {
      props: {
        open: true,
        prTypes: ["1rm", "max_weight"],
      },
    });

    expect(wrapper.text()).toContain("1RM, MAX_WEIGHT");

    const button = wrapper.find("ui5-button");
    if (button.exists()) {
      await button.trigger("click");
      expect(wrapper.emitted("close")).toBeTruthy();
    }
  });
});
