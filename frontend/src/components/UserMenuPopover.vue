<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import "@ui5/webcomponents-fiori/dist/UserMenu.js";
import "@ui5/webcomponents-fiori/dist/UserMenuItem.js";
import "@ui5/webcomponents-fiori/dist/UserMenuAccount.js";

const props = defineProps<{
  open: boolean;
  opener: HTMLElement | null;
  userName: string;
  userEmail: string;
}>();

const emit = defineEmits<{
  close: [];
  profile: [];
  settings: [];
  signOut: [];
}>();

const menuRef = ref<HTMLElement | null>(null);

const handleItemClick = (e: CustomEvent) => {
  const action = (e.detail?.item as HTMLElement | undefined)?.dataset.action;
  if (action === "profile") emit("profile");
  else if (action === "settings") emit("settings");
};

watch(
  () => props.opener,
  async (opener) => {
    if (!opener) return;
    await nextTick();
    const menu = menuRef.value as any;
    if (menu) menu.opener = opener;
  },
  { immediate: true },
);
</script>

<template>
  <ui5-user-menu
    ref="menuRef"
    v-bind="open ? { open: true } : {}"
    @close="emit('close')"
    @item-click="handleItemClick"
    @sign-out-click="emit('signOut')"
  >
    <ui5-user-menu-account
      slot="accounts"
      :title-text="userName"
      :subtitle-text="userEmail"
      selected
    />
    <ui5-user-menu-item text="Profile" icon="person-placeholder" data-action="profile" />
    <ui5-user-menu-item text="Settings" icon="action-settings" data-action="settings" />
  </ui5-user-menu>
</template>
