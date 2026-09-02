<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import "@ui5/webcomponents-fiori/dist/ShellBar.js";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/TabContainer.js";
import "@ui5/webcomponents/dist/Tab.js";
import "@ui5/webcomponents/dist/Icon.js";

import { authStore } from "./store/auth";
import { activeWorkoutStore } from "./store/activeWorkout";
import { settingsStore } from "./store/settings";

import LoginView from "./views/LoginView.vue";
import RegisterView from "./views/RegisterView.vue";
import ActiveWorkoutView from "./views/ActiveWorkoutView.vue";
import WorkoutHistoryView from "./views/WorkoutHistoryView.vue";
import TemplatesView from "./views/TemplatesView.vue";
import ExercisesView from "./views/ExercisesView.vue";
import AnalyticsView from "./views/AnalyticsView.vue";
import MeasurementsView from "./views/MeasurementsView.vue";
import ProfileView from "./views/ProfileView.vue";
import SettingsView from "./views/SettingsView.vue";

const currentTab = ref("workouts");
const isAuthenticated = computed(() => authStore.isAuthenticated.value);
const isWorkingOut = computed(() => activeWorkoutStore.isWorkingOut);

const handleNavigate = (target: string) => {
  currentTab.value = target;
};

const handleTabSelect = (e: any) => {
  const selectedTab = e.detail.tab;
  if (selectedTab && selectedTab.dataset.view) {
    currentTab.value = selectedTab.dataset.view;
  }
};

const handleLogout = async () => {
  await authStore.logout();
  currentTab.value = "login";
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
        <ui5-button design="Transparent" @click="handleNavigate('profile')">Profile</ui5-button>
        <ui5-button design="Transparent" @click="handleNavigate('settings')">Settings</ui5-button>
        <ui5-button design="Transparent" @click="handleLogout">Log Out</ui5-button>
      </div>
    </ui5-shellbar>

    <!-- App Navigation Container for Authenticated Users -->
    <div v-if="isAuthenticated" class="navigation-tabs">
      <ui5-tabcontainer fixed @tab-select="handleTabSelect">
        <ui5-tab
          text="Active Session"
          :selected="currentTab === 'active-workout'"
          data-view="active-workout"
          v-if="isWorkingOut"
        ></ui5-tab>
        <ui5-tab
          text="History"
          :selected="currentTab === 'workouts'"
          data-view="workouts"
        ></ui5-tab>
        <ui5-tab
          text="Templates"
          :selected="currentTab === 'templates'"
          data-view="templates"
        ></ui5-tab>
        <ui5-tab
          text="Exercises"
          :selected="currentTab === 'exercises'"
          data-view="exercises"
        ></ui5-tab>
        <ui5-tab
          text="Analytics"
          :selected="currentTab === 'analytics'"
          data-view="analytics"
        ></ui5-tab>
        <ui5-tab
          text="Measurements"
          :selected="currentTab === 'measurements'"
          data-view="measurements"
        ></ui5-tab>
      </ui5-tabcontainer>
    </div>

    <!-- View Contents -->
    <main class="content-area">
      <template v-if="!isAuthenticated">
        <RegisterView v-if="currentTab === 'register'" @navigate="handleNavigate" />
        <LoginView v-else @navigate="handleNavigate" />
      </template>

      <template v-else>
        <ActiveWorkoutView v-if="currentTab === 'active-workout'" @navigate="handleNavigate" />
        <WorkoutHistoryView v-else-if="currentTab === 'workouts'" @navigate="handleNavigate" />
        <TemplatesView v-else-if="currentTab === 'templates'" @navigate="handleNavigate" />
        <ExercisesView v-else-if="currentTab === 'exercises'" @navigate="handleNavigate" />
        <AnalyticsView v-else-if="currentTab === 'analytics'" @navigate="handleNavigate" />
        <MeasurementsView v-else-if="currentTab === 'measurements'" @navigate="handleNavigate" />
        <ProfileView v-else-if="currentTab === 'profile'" @navigate="handleNavigate" />
        <SettingsView v-else-if="currentTab === 'settings'" @navigate="handleNavigate" />
        <WorkoutHistoryView v-else @navigate="handleNavigate" />
      </template>
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
