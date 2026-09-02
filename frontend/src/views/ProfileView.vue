<script setup lang="ts">
import { ref, onMounted } from "vue";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/MessageStrip.js";
import "@ui5/webcomponents/dist/Label.js";
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/Option.js";
import "@ui5/webcomponents/dist/DatePicker.js";
import "@ui5/webcomponents/dist/TextArea.js";

import { api } from "../api/client";

const profile = ref({
  email: "",
  name: "",
  location: "",
  birthday: "",
  sex: "unspecified",
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
    const res = await api.get<{ profile: any }>("/api/v1/users/profile");
    if (res.profile) {
      profile.value = {
        ...profile.value,
        ...res.profile,
        height: res.profile.height ?? 0,
        sex: res.profile.sex || "unspecified",
        height_unit: res.profile.height_unit || "cm",
      };
    }
  } catch (err: any) {
    message.value = { text: err.message || "Failed to load profile", type: "Negative" };
  } finally {
    loading.value = false;
  }
};

const handleSave = async () => {
  saving.value = true;
  message.value = null;
  try {
    await api.put("/api/v1/users/profile", {
      name: profile.value.name,
      location: profile.value.location,
      birthday: profile.value.birthday,
      sex: profile.value.sex,
      height: Number(profile.value.height),
      height_unit: profile.value.height_unit,
      bio: profile.value.bio,
    });
    message.value = { text: "Profile updated successfully!", type: "Positive" };
  } catch (err: any) {
    message.value = { text: err.message || "Failed to update profile", type: "Negative" };
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
    <ui5-card class="profile-card">
      <ui5-card-header slot="header" title-text="User Profile" subtitle-text="Manage your personal details (REQ-12)" />

      <div class="card-content" v-if="!loading">
        <ui5-message-strip
          v-if="message"
          :design="message.type"
          class="mb-3"
          @close="message = null"
        >
          {{ message.text }}
        </ui5-message-strip>

        <div class="form-group">
          <ui5-label>Email (read-only)</ui5-label>
          <ui5-input :value="profile.email" readonly />
        </div>

        <div class="form-group">
          <ui5-label required>Name</ui5-label>
          <ui5-input :value="profile.name" @input="profile.name = $event.target.value" placeholder="Athlete Name" />
        </div>

        <div class="form-grid">
          <div class="form-group">
            <ui5-label>Location</ui5-label>
            <ui5-input :value="profile.location" @input="profile.location = $event.target.value" placeholder="City, Country" />
          </div>

          <div class="form-group">
            <ui5-label>Date of Birth</ui5-label>
            <ui5-date-picker :value="profile.birthday" @change="profile.birthday = $event.target.value" />
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <ui5-label>Sex</ui5-label>
            <ui5-select @change="profile.sex = $event.target.selectedOption.value">
              <ui5-option value="unspecified" :selected="profile.sex === 'unspecified'">Unspecified</ui5-option>
              <ui5-option value="male" :selected="profile.sex === 'male'">Male</ui5-option>
              <ui5-option value="female" :selected="profile.sex === 'female'">Female</ui5-option>
              <ui5-option value="other" :selected="profile.sex === 'other'">Other</ui5-option>
            </ui5-select>
          </div>

          <div class="form-group">
            <ui5-label>Height</ui5-label>
            <div class="row-inputs">
              <ui5-input
                type="Number"
                :value="String(profile.height)"
                @input="profile.height = Number($event.target.value)"
                placeholder="175"
              />
              <ui5-select @change="profile.height_unit = $event.target.selectedOption.value">
                <ui5-option value="cm" :selected="profile.height_unit === 'cm'">cm</ui5-option>
                <ui5-option value="in" :selected="profile.height_unit === 'in'">in</ui5-option>
              </ui5-select>
            </div>
          </div>
        </div>

        <div class="form-group">
          <ui5-label>Bio</ui5-label>
          <ui5-textarea
            :value="profile.bio"
            @input="profile.bio = $event.target.value"
            placeholder="Tell us about your fitness goals..."
            rows="3"
          />
        </div>

        <div class="actions">
          <ui5-button design="Emphasized" :disabled="saving" @click="handleSave">
            {{ saving ? 'Saving...' : 'Save Profile' }}
          </ui5-button>
        </div>
      </div>
    </ui5-card>
  </div>
</template>

<style scoped>
.profile-container {
  display: flex;
  justify-content: center;
  padding: 1.5rem;
}

.profile-card {
  width: 100%;
  max-width: 600px;
}

.card-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.row-inputs {
  display: flex;
  gap: 0.5rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

@media (max-width: 600px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
