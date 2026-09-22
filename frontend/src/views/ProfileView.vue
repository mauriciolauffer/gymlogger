<script setup lang="ts">
import { ref, onMounted } from "vue";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Form.js";
import "@ui5/webcomponents/dist/FormGroup.js";
import "@ui5/webcomponents/dist/FormItem.js";
import "@ui5/webcomponents/dist/MessageStrip.js";
import "@ui5/webcomponents/dist/Label.js";
import "@ui5/webcomponents/dist/SegmentedButton.js";
import "@ui5/webcomponents/dist/SegmentedButtonItem.js";
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/Option.js";
import "@ui5/webcomponents/dist/DatePicker.js";
import "@ui5/webcomponents/dist/TextArea.js";

import { client } from "../api/client.js";
import type { InferResponseType } from "hono/client";
import { SEX } from "../db/constants.js";

type ProfileGetRes = InferResponseType<typeof client.api.v1.users.profile.$get, 200>;

const profile = ref({
  email: "",
  name: "",
  location: "",
  birthday: "",
  sex: "P",
  height: 0,
  height_unit: "cm",
  bio: "",
});

const loading = ref(false);
const saving = ref(false);
const message = ref<{ text: string; type: "Positive" | "Negative" } | null>(null);

const fetchProfile = async () => {
  loading.value = true;
  try {
    const httpRes = await client.api.v1.users.profile.$get();
    if (!httpRes.ok) {
      const body = (await httpRes.json()) as { error?: string };
      throw new Error(body.error || `Request failed with status ${httpRes.status}`);
    }
    const res = (await httpRes.json()) as ProfileGetRes;
    if (res.profile) {
      profile.value = {
        ...profile.value,
        ...res.profile,
        height: res.profile.height ?? 0,
        sex: res.profile.sex || "P",
        height_unit: res.profile.heightUnit || res.profile.height_unit || "cm",
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load profile";
    message.value = { text: msg, type: "Negative" };
  } finally {
    loading.value = false;
  }
};

const handleSave = async () => {
  saving.value = true;
  message.value = null;
  try {
    await client.api.v1.users.profile.$put({
      json: {
        name: profile.value.name,
        location: profile.value.location,
        birthday: profile.value.birthday,
        sex: profile.value.sex,
        height: Number(profile.value.height) > 0 ? Number(profile.value.height) : undefined,
        height_unit: profile.value.height_unit,
        bio: profile.value.bio,
      },
    });
    message.value = { text: "Profile updated successfully!", type: "Positive" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update profile";
    message.value = { text: msg, type: "Negative" };
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  fetchProfile();
});
</script>

<template>
  <div class="profile-container">
    <ui5-message-strip
      v-if="message"
      :design="message.type"
      class="message-strip"
      @close="message = null"
    >
      {{ message.text }}
    </ui5-message-strip>

    <ui5-form v-if="!loading" header-text="Profile" layout="S1 M1 L1 XL1" accessible-mode="Edit">
      <ui5-form-group header-text="Account">
        <ui5-form-item>
          <ui5-label slot="labelContent">Email</ui5-label>
          <ui5-input :value="profile.email" readonly />
        </ui5-form-item>

        <ui5-form-item>
          <ui5-label slot="labelContent" required>Name</ui5-label>
          <ui5-input
            :value="profile.name"
            placeholder="Athlete Name"
            @input="profile.name = $event.target.value"
          />
        </ui5-form-item>
      </ui5-form-group>

      <ui5-form-group header-text="Personal">
        <ui5-form-item>
          <ui5-label slot="labelContent">Location</ui5-label>
          <ui5-input
            :value="profile.location"
            placeholder="City, Country"
            @input="profile.location = $event.target.value"
          />
        </ui5-form-item>

        <ui5-form-item>
          <ui5-label slot="labelContent">Date of Birth</ui5-label>
          <ui5-date-picker
            :value="profile.birthday"
            @change="profile.birthday = $event.target.value"
          />
        </ui5-form-item>

        <ui5-form-item>
          <ui5-label slot="labelContent">Sex</ui5-label>
          <ui5-select @change="profile.sex = $event.target.selectedOption.value">
            <ui5-option
              v-for="[code, { label }] in SEX"
              :key="code"
              :value="code"
              :selected="profile.sex === code"
              >{{ label }}</ui5-option
            >
          </ui5-select>
        </ui5-form-item>

        <ui5-form-item>
          <ui5-label slot="labelContent">Height</ui5-label>
          <div class="height-row">
            <ui5-input
              type="Number"
              :value="String(profile.height)"
              placeholder="175"
              @input="profile.height = Number($event.target.value)"
            />
            <ui5-segmented-button
              @selection-change="
                profile.height_unit = $event.detail.selectedItems[0]?.dataset.value
              "
            >
              <ui5-segmented-button-item data-value="cm" :selected="profile.height_unit === 'cm'"
                >cm</ui5-segmented-button-item
              >
              <ui5-segmented-button-item data-value="in" :selected="profile.height_unit === 'in'"
                >in</ui5-segmented-button-item
              >
            </ui5-segmented-button>
          </div>
        </ui5-form-item>
      </ui5-form-group>

      <ui5-form-group header-text="Bio">
        <ui5-form-item>
          <ui5-label slot="labelContent">About</ui5-label>
          <ui5-textarea
            :value="profile.bio"
            placeholder="Tell us about your fitness goals..."
            rows="3"
            @input="profile.bio = $event.target.value"
          />
        </ui5-form-item>
      </ui5-form-group>
    </ui5-form>

    <div class="actions">
      <ui5-button design="Emphasized" :disabled="saving || loading" @click="handleSave">
        {{ saving ? "Saving..." : "Save Profile" }}
      </ui5-button>
    </div>
  </div>
</template>

<style scoped>
.profile-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 900px;
}

.message-strip {
  margin-bottom: 0.5rem;
}

.height-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.height-row ui5-input {
  flex: 1;
  max-width: 8rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}
</style>
