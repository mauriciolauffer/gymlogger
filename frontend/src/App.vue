<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import "@ui5/webcomponents-fiori/dist/ShellBar.js";
import "@ui5/webcomponents-fiori/dist/NavigationLayout.js";
import "@ui5/webcomponents-fiori/dist/SideNavigation.js";
import "@ui5/webcomponents-fiori/dist/SideNavigationItem.js";
import "@ui5/webcomponents/dist/Avatar.js";
import "@ui5/webcomponents-icons/dist/user-settings.js";
import "@ui5/webcomponents-icons/dist/person-placeholder.js";
import "@ui5/webcomponents-icons/dist/action-settings.js";
import "@ui5/webcomponents-icons/dist/menu2.js";
import "@ui5/webcomponents-icons/dist/history.js";
import "@ui5/webcomponents-icons/dist/document-text.js";
import "@ui5/webcomponents-icons/dist/physical-activity.js";
import "@ui5/webcomponents-icons/dist/bar-chart.js";
import "@ui5/webcomponents-icons/dist/measure.js";
import "@ui5/webcomponents-icons/dist/play.js";

const UserMenuPopover = defineAsyncComponent(
  () => import("./components/UserMenuPopover.vue"),
);

import { authStore } from "./store/auth";
import { activeWorkoutStore } from "./store/activeWorkout";
import { settingsStore } from "./store/settings";

const router = useRouter();
const route = useRoute();

const isAuthenticated = computed(() => authStore.isAuthenticated.value);
const isWorkingOut = computed(() => activeWorkoutStore.isWorkingOut);
const userName = computed(() => authStore.user?.name ?? "");
const userEmail = computed(() => authStore.user?.email ?? "");

const navMode = ref<"Collapsed" | "Expanded">("Collapsed");
const toggleNav = () => {
  navMode.value = navMode.value === "Expanded" ? "Collapsed" : "Expanded";
};

const userMenuOpen = ref(false);
const userMenuMounted = ref(false);
const userMenuOpener = ref<HTMLElement | null>(null);

const handleProfileClick = (e: CustomEvent) => {
  userMenuOpener.value = e.detail.targetRef;
  userMenuMounted.value = true;
  userMenuOpen.value = true;
};

const handleNavSelectionChange = (e: CustomEvent) => {
  const item = e.detail?.item as HTMLElement | undefined;
  const path = item?.dataset.path;
  if (path) router.push(path);
};

onMounted(() => {
  if (isAuthenticated.value) {
    settingsStore.fetchSettings();
  }
});
</script>

<template>
  <div class="app-shell">
    <ui5-navigation-layout :mode="navMode">
      <ui5-shellbar
        slot="header"
        primary-title="GymLogger"
        secondary-title="Workout Tracker"
        @profile-click="handleProfileClick"
      >
        <ui5-button slot="startButton" icon="menu2" @click="toggleNav" />
        <ui5-avatar
          v-if="isAuthenticated"
          slot="profile"
          icon="user-settings"
          accessible-name="User menu"
          interactive
        />
      </ui5-shellbar>

      <ui5-side-navigation
        v-if="isAuthenticated"
        slot="sideContent"
        @selection-change="handleNavSelectionChange"
      >
        <ui5-side-navigation-item
          v-if="isWorkingOut"
          text="Active Session"
          icon="play"
          :selected="route.path === '/active-workout'"
          data-path="/active-workout"
        />
        <ui5-side-navigation-item
          text="History"
          icon="history"
          :selected="route.path === '/workouts'"
          data-path="/workouts"
        />
        <ui5-side-navigation-item
          text="Templates"
          icon="document-text"
          :selected="route.path === '/templates'"
          data-path="/templates"
        />
        <ui5-side-navigation-item
          text="Exercises"
          icon="physical-activity"
          :selected="route.path === '/exercises'"
          data-path="/exercises"
        />
        <ui5-side-navigation-item
          text="Analytics"
          icon="bar-chart"
          :selected="route.path === '/analytics'"
          data-path="/analytics"
        />
        <ui5-side-navigation-item
          text="Measurements"
          icon="measure"
          :selected="route.path === '/measurements'"
          data-path="/measurements"
        />
      </ui5-side-navigation>

      <main class="content-area">
        <router-view />
      </main>
    </ui5-navigation-layout>

    <UserMenuPopover
      v-if="userMenuMounted"
      :open="userMenuOpen"
      :opener="userMenuOpener"
      :user-name="userName"
      :user-email="userEmail"
      @close="userMenuOpen = false"
      @profile="router.push('/profile')"
      @settings="router.push('/settings')"
      @sign-out="authStore.logout().then(() => router.push('/login'))"
    />
  </div>
</template>

<style>
:root {
  font-family: var(
    --sapFontFamily,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif
  );
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--sapBackgroundColor, #f5f7fa);
  color: var(--sapTextColor, #32363a);
}

.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

ui5-navigation-layout {
  flex: 1;
  overflow: hidden;
}

.content-area {
  padding: 1.5rem;
  overflow-y: auto;
  height: 100%;
  box-sizing: border-box;
}
</style>
