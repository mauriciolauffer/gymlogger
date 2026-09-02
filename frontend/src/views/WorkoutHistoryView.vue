<script setup lang="ts">
import { ref, onMounted } from "vue";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/ListItemStandard.js";

import { api } from "../api/client";
import { activeWorkoutStore } from "../store/activeWorkout";
import WorkoutDetailModal from "../components/WorkoutDetailModal.vue";

const emit = defineEmits(["navigate"]);

const workouts = ref<any[]>([]);
const loading = ref(false);
const selectedWorkout = ref<any | null>(null);

const fetchWorkouts = async () => {
  loading.value = true;
  try {
    const res = await api.get<{ workouts: any[] }>("/api/v1/workouts");
    workouts.value = res.workouts || [];
  } catch (err) {
    console.error("Failed to fetch workouts history", err);
  } finally {
    loading.value = false;
  }
};

const handleStartNewWorkout = async () => {
  await activeWorkoutStore.startWorkout("Empty Workout Session");
  emit("navigate", "active-workout");
};

const handleViewWorkout = async (workoutId: string) => {
  try {
    const res = await api.get<{ workout: any }>(`/api/v1/workouts/${workoutId}`);
    selectedWorkout.value = res.workout;
  } catch (err) {
    console.error("Failed to load workout details", err);
  }
};

const handleDeleteWorkout = async (workoutId: string, event: Event) => {
  event.stopPropagation();
  if (!confirm("Are you sure you want to delete this workout log?")) return;
  try {
    await api.delete(`/api/v1/workouts/${workoutId}`);
    fetchWorkouts();
  } catch (err) {
    console.error("Failed to delete workout", err);
  }
};

const formatDate = (iso: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDuration = (secs: number) => {
  if (!secs) return "0m";
  const m = Math.floor(secs / 60);
  return `${m}m`;
};

onMounted(() => {
  fetchWorkouts();
});
</script>

<template>
  <div class="history-container">
    <div class="header-actions">
      <div>
        <ui5-title level="H2">Workout History</ui5-title>
        <p class="subtitle">Review completed sessions and performance</p>
      </div>
      <ui5-button design="Emphasized" @click="handleStartNewWorkout">
        + Start Empty Workout
      </ui5-button>
    </div>

    <ui5-card class="history-card">
      <div v-if="loading" class="loading-state">Loading workout history...</div>

      <ui5-list v-else-if="workouts.length">
        <ui5-list-item-standard
          v-for="w in workouts"
          :key="w.id"
          :description="`${formatDate(w.start_time)} • ${formatDuration(w.duration_seconds)} • ${w.total_volume || 0} kg`"
          @click="handleViewWorkout(w.id)"
        >
          {{ w.title }}
          <ui5-button
            slot="endContent"
            design="Transparent"
            icon="delete"
            @click="handleDeleteWorkout(w.id, $event)"
          >
            Delete
          </ui5-button>
        </ui5-list-item-standard>
      </ui5-list>

      <div v-else class="empty-state">
        <p>No workout sessions logged yet. Tap "Start Empty Workout" to begin your first session!</p>
      </div>
    </ui5-card>

    <WorkoutDetailModal
      :open="!!selectedWorkout"
      :workout="selectedWorkout"
      @close="selectedWorkout = null"
    />
  </div>
</template>

<style scoped>
.history-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.subtitle {
  color: var(--sapContent_LabelColor, #666);
  font-size: 0.9rem;
  margin-top: 0.2rem;
}

.history-card {
  width: 100%;
}

.loading-state,
.empty-state {
  padding: 3rem;
  text-align: center;
  color: var(--sapContent_LabelColor, #666);
}
</style>
