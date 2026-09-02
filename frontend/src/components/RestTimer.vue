<script setup lang="ts">
import { computed } from "vue";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Card.js";

import { activeWorkoutStore } from "../store/activeWorkout";

const restTimer = computed(() => activeWorkoutStore.restTimer);

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const handleDismiss = () => {
  activeWorkoutStore.stopRestTimer();
};
</script>

<template>
  <div v-if="restTimer.active" class="rest-timer-bar">
    <div class="timer-info">
      <span class="label">Rest Timer (REQ-04):</span>
      <span class="time-display">{{ formatTime(restTimer.remaining) }}</span>
    </div>
    <div class="actions">
      <ui5-button design="Transparent" @click="handleDismiss">Skip Rest</ui5-button>
    </div>
  </div>
</template>

<style scoped>
.rest-timer-bar {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 1000;
  background-color: var(--sapBrandColor, #0a6ed1);
  color: #ffffff;
  padding: 0.75rem 1.25rem;
  border-radius: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.timer-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.label {
  font-size: 0.85rem;
  opacity: 0.9;
}

.time-display {
  font-size: 1.2rem;
  font-weight: bold;
  font-family: monospace;
}

.actions ui5-button {
  color: #ffffff;
}
</style>
