<script setup lang="ts">
import { ref, onMounted } from "vue";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Form.js";
import "@ui5/webcomponents/dist/FormGroup.js";
import "@ui5/webcomponents/dist/FormItem.js";
import "@ui5/webcomponents/dist/MessageStrip.js";
import "@ui5/webcomponents/dist/Label.js";
import "@ui5/webcomponents/dist/SegmentedButton.js";
import "@ui5/webcomponents/dist/SegmentedButtonItem.js";
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save settings";
    message.value = { text: msg, type: "Negative" };
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="settings-container">
    <ui5-message-strip
      v-if="message"
      :design="message.type"
      class="message-strip"
      @close="message = null"
    >
      {{ message.text }}
    </ui5-message-strip>

    <ui5-form header-text="Settings" layout="S1 M1 L1 XL1" accessible-mode="Edit">
      <ui5-form-group header-text="Units">
        <ui5-form-item>
          <ui5-label slot="labelContent">Weight</ui5-label>
          <ui5-segmented-button
            @selection-change="
              settings.preferred_weight_unit = $event.detail.selectedItems[0]?.dataset.value
            "
          >
            <ui5-segmented-button-item
              data-value="kg"
              :selected="settings.preferred_weight_unit === 'kg'"
              >kg</ui5-segmented-button-item
            >
            <ui5-segmented-button-item
              data-value="lbs"
              :selected="settings.preferred_weight_unit === 'lbs'"
              >lbs</ui5-segmented-button-item
            >
          </ui5-segmented-button>
        </ui5-form-item>

        <ui5-form-item>
          <ui5-label slot="labelContent">Distance / Length</ui5-label>
          <ui5-segmented-button
            @selection-change="
              settings.preferred_length_unit = $event.detail.selectedItems[0]?.dataset.value
            "
          >
            <ui5-segmented-button-item
              data-value="cm"
              :selected="settings.preferred_length_unit === 'cm'"
              >cm</ui5-segmented-button-item
            >
            <ui5-segmented-button-item
              data-value="in"
              :selected="settings.preferred_length_unit === 'in'"
              >in</ui5-segmented-button-item
            >
          </ui5-segmented-button>
        </ui5-form-item>
      </ui5-form-group>

      <ui5-form-group header-text="Appearance">
        <ui5-form-item>
          <ui5-label slot="labelContent">Theme</ui5-label>
          <ui5-segmented-button
            @selection-change="settings.theme = $event.detail.selectedItems[0]?.dataset.value"
          >
            <ui5-segmented-button-item data-value="system" :selected="settings.theme === 'system'"
              >System</ui5-segmented-button-item
            >
            <ui5-segmented-button-item data-value="light" :selected="settings.theme === 'light'"
              >Light</ui5-segmented-button-item
            >
            <ui5-segmented-button-item data-value="dark" :selected="settings.theme === 'dark'"
              >Dark</ui5-segmented-button-item
            >
          </ui5-segmented-button>
        </ui5-form-item>

        <ui5-form-item>
          <ui5-label slot="labelContent">Language</ui5-label>
          <ui5-select @change="settings.language = $event.target.selectedOption.value">
            <ui5-option value="en" :selected="settings.language === 'en'">English</ui5-option>
            <ui5-option value="pt" :selected="settings.language === 'pt'">Português</ui5-option>
            <ui5-option value="es" :selected="settings.language === 'es'">Español</ui5-option>
          </ui5-select>
        </ui5-form-item>
      </ui5-form-group>

      <ui5-form-group header-text="Rest Timer">
        <ui5-form-item>
          <ui5-label slot="labelContent">Default Inter-Set Rest Duration (seconds)</ui5-label>
          <ui5-step-input
            :value="settings.rest_timer_duration_seconds"
            min="10"
            max="600"
            step="15"
            @change="settings.rest_timer_duration_seconds = Number($event.target.value)"
          />
        </ui5-form-item>

        <ui5-form-item>
          <ui5-label slot="labelContent">Enable Notifications</ui5-label>
          <ui5-switch
            :checked="settings.notifications_enabled"
            @change="settings.notifications_enabled = $event.target.checked"
          />
        </ui5-form-item>
      </ui5-form-group>
    </ui5-form>

    <div class="actions">
      <ui5-button design="Emphasized" :disabled="saving" @click="handleSave">
        {{ saving ? "Saving..." : "Save Settings" }}
      </ui5-button>
    </div>
  </div>
</template>

<style scoped>
.settings-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 800px;
}

.message-strip {
  margin-bottom: 0.5rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

ui5-segmented-button {
  max-width: 16rem;
}
</style>
