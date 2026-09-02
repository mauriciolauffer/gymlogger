<script setup lang="ts">
import "@ui5/webcomponents/dist/Dialog.js";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/ListItemStandard.js";

defineProps<{
  open: boolean;
  workout: any | null;
}>();

const emit = defineEmits(["close"]);

const formatDate = (iso: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatDuration = (secs: number) => {
  if (!secs) return "0m";
  const m = Math.floor(secs / 60);
  return `${m}m`;
};
</script>

<template>
  <ui5-dialog
    :open="open"
    :header-text="workout ? workout.title : 'Workout Detail'"
    @close="emit('close')"
  >
    <div class="dialog-content" v-if="workout">
      <div class="summary-bar">
        <span>📅 {{ formatDate(workout.start_time) }}</span>
        <span>⏱ {{ formatDuration(workout.duration_seconds) }}</span>
        <span>🏋️ {{ workout.total_volume || 0 }} kg</span>
      </div>

      <p class="notes" v-if="workout.notes">Notes: {{ workout.notes }}</p>

      <div class="exercises-container">
        <div
          v-for="ex in workout.exercises"
          :key="ex.id"
          class="exercise-block"
        >
          <ui5-title level="H4" class="ex-title">{{ ex.exercise_name }}</ui5-title>

          <div class="sets-list">
            <div
              v-for="(s, idx) in ex.sets"
              :key="s.id"
              class="set-item"
            >
              <span class="set-idx">Set {{ idx + 1 }}:</span>
              <span>{{ s.weight }} {{ s.weight_unit || 'kg' }} × {{ s.reps }} reps</span>
              <span class="set-type" v-if="s.set_type && s.set_type !== 'normal'">
                ({{ s.set_type }})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div slot="footer" class="dialog-footer">
      <ui5-button design="Emphasized" @click="emit('close')">Close</ui5-button>
    </div>
  </ui5-dialog>
</template>

<style scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem 0;
  width: 450px;
  max-width: 100%;
}

.summary-bar {
  display: flex;
  justify-content: space-between;
  background-color: var(--sapList_Background, #f8f9fa);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.notes {
  font-style: italic;
  color: var(--sapContent_LabelColor, #666);
  font-size: 0.9rem;
}

.exercises-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.exercise-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--sapList_BorderColor, #e0e0e0);
}

.ex-title {
  color: var(--sapBrandColor, #0a6ed1);
}

.sets-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.set-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.set-idx {
  color: var(--sapContent_LabelColor, #666);
  width: 50px;
}

.set-type {
  color: #d97706;
  font-size: 0.8rem;
  text-transform: capitalize;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem 1rem;
}
</style>
