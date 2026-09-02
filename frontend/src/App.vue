<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import "@ui5/webcomponents-fiori/dist/ShellBar.js";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/TabContainer.js";
import "@ui5/webcomponents/dist/Tab.js";

import { authStore } from "./store/auth";
import { activeWorkoutStore } from "./store/activeWorkout";
import { settingsStore } from "./store/settings";

const router = useRouter();
const route = useRoute();

const isAuthenticated = computed(() => authStore.isAuthenticated.value);
const isWorkingOut = computed(() => activeWorkoutStore.isWorkingOut);

const handleTabSelect = (e: any) => {
  const selectedTab = e.detail.tab;
  if (selectedTab && selectedTab.dataset.path) {
    router.push(selectedTab.dataset.path);
  }
};

const navigateTo = (path: string) => {
  router.push(path);
};

const handleLogout = async () => {
  await authStore.logout();
  router.push("/login");
};

onMounted(() => {
  if (isAuthenticated.value) {
    settingsStore.fetchSettings();
  }
});
</script>

<template>
  <div class="app-shell">
    <!-- SAP UI5 ShellBar -->
    <ui5-shellbar primary-title="GymLogger" secondary-title="Workout Tracker">
      <div slot="profile" v-if="isAuthenticated" class="shell-actions">
        <ui5-button design="Transparent" @click="navigateTo('/profile')">Profile</ui5-button>
        <ui5-button design="Transparent" @click="navigateTo('/settings')">Settings</ui5-button>
        <ui5-button design="Transparent" @click="handleLogout">Log Out</ui5-button>
      </div>
    </ui5-shellbar>

    <!-- Navigation Tabs for Authenticated Users -->
    <div v-if="isAuthenticated" class="navigation-tabs">
      <ui5-tabcontainer fixed @tab-select="handleTabSelect">
        <ui5-tab
          text="Active Session"
          :selected="route.path === '/active-workout'"
          data-path="/active-workout"
          v-if="isWorkingOut"
        ></ui5-tab>
        <ui5-tab
          text="History"
          :selected="route.path === '/workouts'"
          data-path="/workouts"
        ></ui5-tab>
        <ui5-tab
          text="Templates"
          :selected="route.path === '/templates'"
          data-path="/templates"
        ></ui5-tab>
        <ui5-tab
          text="Exercises"
          :selected="route.path === '/exercises'"
          data-path="/exercises"
        ></ui5-tab>
        <ui5-tab
          text="Analytics"
          :selected="route.path === '/analytics'"
          data-path="/analytics"
        ></ui5-tab>
        <ui5-tab
          text="Measurements"
          :selected="route.path === '/measurements'"
          data-path="/measurements"
        ></ui5-tab>
      </ui5-tabcontainer>
    </div>

    <!-- Router View Area -->
    <main class="content-area">
      <router-view />
    </main>
  </div>
</template>

<style>
:root {
  font-family: var(--sapFontFamily, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
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
  min-height: 100vh;
}

.navigation-tabs {
  background-color: var(--sapList_Background, #ffffff);
  border-bottom: 1px solid var(--sapList_BorderColor, #d9d9d9);
}

.content-area {
  flex: 1;
}

.shell-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
</style>
