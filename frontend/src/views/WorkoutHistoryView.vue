<script setup lang="ts">
import { ref, shallowRef, onMounted } from "vue";
import { useRouter } from "vue-router";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/ListItemStandard.js";

import { formatDate, formatDuration } from "../utils/formatters";
import { client } from "../api/client";
import type { WorkoutsGetRes, WorkoutGetRes } from "../api/types";
import { activeWorkoutStore } from "../store/activeWorkout";
import WorkoutDetailModal from "../components/WorkoutDetailModal.vue";

interface WorkoutSummary {
  id: string;
  title: string;
  startTime: string | Date;
  durationSeconds: number;
  totalVolume?: number;
}

const router = useRouter();

const workouts = ref<WorkoutSummary[]>([]);
const loading = shallowRef(false);
const selectedWorkout = ref<WorkoutSummary | null>(null);

const fetchWorkouts = async () => {
  loading.value = true;
  try {
    const res = (await (await client.api.v1.workouts.$get()).json()) as WorkoutsGetRes;
    workouts.value = res.workouts || [];
  } catch (err) {
    console.error("Failed to fetch workouts history", err);
  } finally {
    loading.value = false;
  }
};

const handleStartNewWorkout = async () => {
  await activeWorkoutStore.startWorkout("Empty Workout Session");
  router.push("/active-workout");
};

const handleViewWorkout = async (workoutId: string) => {
  try {
    const res = (await (
      await client.api.v1.workouts[":id"].$get({ param: { id: workoutId } })
    ).json()) as WorkoutGetRes;
    selectedWorkout.value = res.workout;
  } catch (err) {
    console.error("Failed to load workout details", err);
  }
};

const handleDeleteWorkout = async (workoutId: string, event: Event) => {
  event.stopPropagation();
  if (!confirm("Are you sure you want to delete this workout log?")) return;
  try {
    await client.api.v1.workouts[":id"].$delete({ param: { id: workoutId } });
    fetchWorkouts();
  } catch (err) {
    console.error("Failed to delete workout", err);
  }
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
          :description="`${formatDate(w.startTime)} • ${formatDuration(w.durationSeconds)} • ${w.totalVolume || 0} kg`"
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
        <p>
          No workout sessions logged yet. Tap "Start Empty Workout" to begin your first session!
        </p>
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
