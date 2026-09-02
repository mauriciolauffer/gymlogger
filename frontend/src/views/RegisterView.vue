<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/MessageStrip.js";
import "@ui5/webcomponents/dist/Label.js";

import { api } from "../api/client";
import { authStore } from "../store/auth";

const router = useRouter();

const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const errorMsg = ref("");
const loading = ref(false);

const handleNameInput = (e: any) => { name.value = e.target.value; };
const handleEmailInput = (e: any) => { email.value = e.target.value; };
const handlePasswordInput = (e: any) => { password.value = e.target.value; };
const handleConfirmInput = (e: any) => { confirmPassword.value = e.target.value; };

const handleRegister = async () => {
  errorMsg.value = "";
  if (!email.value || !password.value) {
    errorMsg.value = "Email and password are required.";
    return;
  }
  if (password.value.length < 6) {
    errorMsg.value = "Password must be at least 6 characters long.";
    return;
  }
  if (password.value !== confirmPassword.value) {
    errorMsg.value = "Passwords do not match.";
    return;
  }

  loading.value = true;
  try {
    const res = await api.post<{ token: string; user: any }>("/api/v1/auth/register", {
      name: name.value || "Athlete",
      email: email.value,
      password: password.value,
    });
    authStore.setAuth(res.token, res.user);
    router.push("/workouts");
  } catch (err: any) {
    errorMsg.value = err.message || "Registration failed. Please try again.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="auth-container">
    <ui5-card class="auth-card">
      <ui5-card-header slot="header" title-text="GymLogger" subtitle-text="Create a new account" />
      <div class="card-content">
        <ui5-message-strip v-if="errorMsg" design="Negative" class="mb-3" @close="errorMsg = ''">
          {{ errorMsg }}
        </ui5-message-strip>

        <div class="form-group">
          <ui5-label for="name-input">Full Name</ui5-label>
          <ui5-input
            id="name-input"
            :value="name"
            placeholder="John Doe"
            @input="handleNameInput"
          />
        </div>

        <div class="form-group">
          <ui5-label required for="email-input">Email</ui5-label>
          <ui5-input
            id="email-input"
            type="Email"
            :value="email"
            placeholder="athlete@example.com"
            @input="handleEmailInput"
          />
        </div>

        <div class="form-group">
          <ui5-label required for="password-input">Password (min 6 chars)</ui5-label>
          <ui5-input
            id="password-input"
            type="Password"
            :value="password"
            placeholder="••••••••"
            @input="handlePasswordInput"
          />
        </div>

        <div class="form-group">
          <ui5-label required for="confirm-password-input">Confirm Password</ui5-label>
          <ui5-input
            id="confirm-password-input"
            type="Password"
            :value="confirmPassword"
            placeholder="••••••••"
            @input="handleConfirmInput"
          />
        </div>

        <div class="actions">
          <ui5-button design="Emphasized" :disabled="loading" @click="handleRegister">
            {{ loading ? 'Creating Account...' : 'Register' }}
          </ui5-button>
          <ui5-button design="Transparent" @click="router.push('/login')">
            Already have an account? Log In
          </ui5-button>
        </div>
      </div>
    </ui5-card>
  </div>
</template>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 1rem;
}

.auth-card {
  width: 100%;
  max-width: 400px;
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

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.mb-3 {
  margin-bottom: 0.75rem;
}
</style>
