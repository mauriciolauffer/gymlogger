<script setup lang="ts">
import { ref, onMounted } from "vue";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/MessageStrip.js";
import "@ui5/webcomponents/dist/Label.js";
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/Option.js";
import "@ui5/webcomponents/dist/StepInput.js";
import "@ui5/webcomponents/dist/Switch.js";

import { settingsStore, type UserSettings } from "../store/settings";

const settings = ref<UserSettings>({ ...settingsStore.settings });
const saving = ref(false);
const message = ref<{ text: string; type: "Positive" | "Negative" } | null>(null);

onMounted(async () => {
  await settingsStore.fetchSettings();
  settings.value = { ...settingsStore.settings };
});

const handleSave = async () => {
  saving.value = true;
  message.value = null;
  try {
    await settingsStore.updateSettings(settings.value);
    message.value = { text: "Preferences saved successfully!", type: "Positive" };
  } catch (err: any) {
    message.value = { text: err.message || "Failed to save settings", type: "Negative" };
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="settings-container">
    <ui5-card class="settings-card">
      <ui5-card-header slot="header" title-text="System Settings" subtitle-text="Configure app preferences (REQ-13)" />

      <div class="card-content">
        <ui5-message-strip
          v-if="message"
          :design="message.type"
          class="mb-3"
          @close="message = null"
        >
          {{ message.text }}
        </ui5-message-strip>

        <div class="form-group">
          <ui5-label>Preferred Weight Unit</ui5-label>
          <ui5-select @change="settings.preferred_weight_unit = $event.target.selectedOption.value">
            <ui5-option value="kg" :selected="settings.preferred_weight_unit === 'kg'">Kilograms (kg)</ui5-option>
            <ui5-option value="lb" :selected="settings.preferred_weight_unit === 'lb'">Pounds (lb)</ui5-option>
          </ui5-select>
        </div>

        <div class="form-group">
          <ui5-label>Preferred Distance / Length Unit</ui5-label>
          <ui5-select @change="settings.preferred_length_unit = $event.target.selectedOption.value">
            <ui5-option value="cm" :selected="settings.preferred_length_unit === 'cm'">Centimeters (cm)</ui5-option>
            <ui5-option value="in" :selected="settings.preferred_length_unit === 'in'">Inches (in)</ui5-option>
          </ui5-select>
        </div>

        <div class="form-group">
          <ui5-label>Theme</ui5-label>
          <ui5-select @change="settings.theme = $event.target.selectedOption.value">
            <ui5-option value="system" :selected="settings.theme === 'system'">System Default</ui5-option>
            <ui5-option value="light" :selected="settings.theme === 'light'">Light Mode</ui5-option>
            <ui5-option value="dark" :selected="settings.theme === 'dark'">Dark Mode</ui5-option>
          </ui5-select>
        </div>

        <div class="form-group">
          <ui5-label>Default Inter-Set Rest Duration (seconds)</ui5-label>
          <ui5-step-input
            :value="settings.rest_timer_duration_seconds"
            min="10"
            max="600"
            step="15"
            @change="settings.rest_timer_duration_seconds = Number($event.target.value)"
          />
        </div>

        <div class="form-group row-align">
          <ui5-label>Enable Rest Timer Notifications</ui5-label>
          <ui5-switch
            :checked="settings.notifications_enabled"
            @change="settings.notifications_enabled = $event.target.checked"
          />
        </div>

        <div class="actions">
          <ui5-button design="Emphasized" :disabled="saving" @click="handleSave">
            {{ saving ? 'Saving...' : 'Save Settings' }}
          </ui5-button>
        </div>
      </div>
    </ui5-card>
  </div>
</template>

<style scoped>
.settings-container {
  display: flex;
  justify-content: center;
  padding: 1.5rem;
}

.settings-card {
  width: 100%;
  max-width: 600px;
}

.card-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.row-align {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.mb-3 {
  margin-bottom: 0.75rem;
}
</style>
