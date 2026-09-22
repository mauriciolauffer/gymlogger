<script setup lang="ts">
import { ref, shallowRef, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/Option.js";
import "@ui5/webcomponents/dist/Dialog.js";

import { client } from "../api/client";
import type { InferResponseType } from "hono/client";
import { formatDuration } from "../utils/formatters";

type ExercisesRes = InferResponseType<typeof client.api.v1.exercises.$get, 200>;
import {
  activeWorkoutStore,
  type ActiveWorkoutExercise,
  type ActiveWorkoutSet,
} from "../store/activeWorkout";
import RestTimer from "../components/RestTimer.vue";
import PrNotificationDialog from "../components/PrNotificationDialog.vue";
import WarmupCalculatorModal from "../components/WarmupCalculatorModal.vue";
import WorkoutExerciseCard from "../components/WorkoutExerciseCard.vue";

const router = useRouter();

const workout = computed(() => activeWorkoutStore.workout);
const elapsedSeconds = computed(() => activeWorkoutStore.elapsedSeconds);

const showAddExerciseModal = shallowRef(false);
const availableExercises = ref<ActiveWorkoutExercise[]>([]);
const selectedExerciseId = shallowRef("");

const prNotification = ref<{ open: boolean; prTypes: string[] }>({
  open: false,
  prTypes: [],
});

const warmupModal = ref<{ open: boolean; targetWeight?: number }>({
  open: false,
  targetWeight: 100,
});

const finishNotes = shallowRef("");
const showFinishModal = shallowRef(false);

const fetchAvailableExercises = async () => {
  try {
    const res = (await (await client.api.v1.exercises.$get()).json()) as ExercisesRes;
    availableExercises.value = res.exercises || [];
  } catch (err) {
    console.error("Failed to load exercises", err);
  }
};

onMounted(() => {
  fetchAvailableExercises();
  if (!workout.value) {
    activeWorkoutStore.startWorkout("Workout");
  }
});

const handleAddExerciseClick = () => {
  selectedExerciseId.value = "";
  showAddExerciseModal.value = true;
};

const handleConfirmAddExercise = async () => {
  if (!selectedExerciseId.value) return;
  await activeWorkoutStore.addExercise(selectedExerciseId.value);
  showAddExerciseModal.value = false;
};

const handleAddSet = async (exerciseId: string) => {
  const exercise = workout.value?.exercises.find((e) => e.id === exerciseId);
  if (!exercise) return;

  let defaultWeight = 20;
  let defaultReps = 10;
  const setIndex = exercise.sets.length;

  if (setIndex > 0) {
    const lastSet = exercise.sets[setIndex - 1];
    defaultWeight = lastSet.weight;
    defaultReps = lastSet.reps;
  } else if (exercise.previousSets && exercise.previousSets.length > 0) {
    defaultWeight = exercise.previousSets[0].weight;
    defaultReps = exercise.previousSets[0].reps;
  }

  const result = await activeWorkoutStore.logSet(exerciseId, {
    set_type: "NO",
    weight: defaultWeight,
    reps: defaultReps,
    order_index: setIndex,
  });

  if (result && result.isPr) {
    prNotification.value = {
      open: true,
      prTypes: result.prTypes || ["1RM"],
    };
  }
};

const handleUpdateSetWeight = async (setId: string, newWeight: number) => {
  const res = await activeWorkoutStore.updateSet(setId, { weight: Number(newWeight) });
  if (res && res.isPr) {
    prNotification.value = { open: true, prTypes: res.prTypes || ["1RM"] };
  }
};

const handleUpdateSetReps = async (setId: string, newReps: number) => {
  const res = await activeWorkoutStore.updateSet(setId, { reps: Number(newReps) });
  if (res && res.isPr) {
    prNotification.value = { open: true, prTypes: res.prTypes || ["1RM"] };
  }
};

const handleUpdateSetType = async (setId: string, newType: string) => {
  await activeWorkoutStore.updateSet(setId, { setType: newType as ActiveWorkoutSet["setType"] });
};

const handleDeleteSet = async (setId: string) => {
  await activeWorkoutStore.deleteSet(setId);
};

const handleOpenWarmup = (targetWeight: number) => {
  warmupModal.value = { open: true, targetWeight };
};

const handleFinishWorkout = async () => {
  await activeWorkoutStore.finishWorkout(finishNotes.value);
  showFinishModal.value = false;
  router.push("/workouts");
};
</script>

<template>
  <div class="active-workout-container" v-if="workout">
    <!-- Header Summary -->
    <div class="workout-header">
      <div>
        <ui5-title level="H2">{{ workout.title }}</ui5-title>
        <div class="stats-row">
          <span>⏱ {{ formatDuration(elapsedSeconds) }}</span>
          <span>🏋️ {{ workout.totalVolume || 0 }} kg total</span>
          <span>💪 {{ workout.setCount || 0 }} sets</span>
        </div>
      </div>
      <ui5-button design="Emphasized" @click="showFinishModal = true">Finish Workout</ui5-button>
    </div>

    <!-- Exercises List -->
    <div class="exercises-list">
      <WorkoutExerciseCard
        v-for="(ex, exIdx) in workout.exercises"
        :key="ex.id"
        :exercise="ex"
        :index="exIdx"
        @add-set="handleAddSet"
        @update-set-weight="handleUpdateSetWeight"
        @update-set-reps="handleUpdateSetReps"
        @update-set-type="handleUpdateSetType"
        @delete-set="handleDeleteSet"
        @open-warmup="handleOpenWarmup"
      />
    </div>

    <!-- Add Exercise Action -->
    <div class="bottom-actions">
      <ui5-button design="Emphasized" @click="handleAddExerciseClick"> + Add Exercise </ui5-button>
    </div>

    <!-- Modals & Widgets -->
    <RestTimer />

    <PrNotificationDialog
      :open="prNotification.open"
      :pr-types="prNotification.prTypes"
      @close="prNotification.open = false"
    />

    <WarmupCalculatorModal
      :open="warmupModal.open"
      :target-weight="warmupModal.targetWeight"
      @close="warmupModal.open = false"
    />

    <!-- Add Exercise Modal -->
    <ui5-dialog
      :open="showAddExerciseModal"
      header-text="Add Exercise to Workout"
      @close="showAddExerciseModal = false"
    >
      <div class="dialog-content">
        <ui5-select
          class="full-width"
          @change="selectedExerciseId = $event.target.selectedOption.value"
        >
          <ui5-option value="">Select Exercise</ui5-option>
          <ui5-option
            v-for="e in availableExercises"
            :key="e.id"
            :value="e.id"
            :selected="selectedExerciseId === e.id"
          >
            {{ e.name }}
          </ui5-option>
        </ui5-select>
      </div>
      <div slot="footer" class="dialog-footer">
        <ui5-button design="Transparent" @click="showAddExerciseModal = false">Cancel</ui5-button>
        <ui5-button design="Emphasized" @click="handleConfirmAddExercise">Add</ui5-button>
      </div>
    </ui5-dialog>

    <!-- Finish Workout Modal -->
    <ui5-dialog
      :open="showFinishModal"
      header-text="Finish Workout Session"
      @close="showFinishModal = false"
    >
      <div class="dialog-content">
        <p>Great job! Ready to complete this workout session?</p>
        <ui5-input
          :value="finishNotes"
          @input="finishNotes = $event.target.value"
          placeholder="Session notes / comments..."
        />
      </div>
      <div slot="footer" class="dialog-footer">
        <ui5-button design="Transparent" @click="showFinishModal = false">Cancel</ui5-button>
        <ui5-button design="Emphasized" @click="handleFinishWorkout">Complete Session</ui5-button>
      </div>
    </ui5-dialog>
  </div>
</template>

<style scoped>
.active-workout-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 5rem;
}

.workout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--sapList_Background, #ffffff);
  padding: 1.25rem;
  border-radius: 8px;
  border: 1px solid var(--sapList_BorderColor, #e0e0e0);
}

.stats-row {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: var(--sapContent_LabelColor, #666);
}

.exercises-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bottom-actions {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 0;
  width: 340px;
  max-width: 100%;
}

.full-width {
  width: 100%;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
}
</style>
