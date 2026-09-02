<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/Option.js";
import "@ui5/webcomponents/dist/Dialog.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/ListItemStandard.js";

import { api } from "../api/client";
import { activeWorkoutStore, type ActiveWorkoutSet } from "../store/activeWorkout";
import RestTimer from "../components/RestTimer.vue";
import PrNotificationDialog from "../components/PrNotificationDialog.vue";
import WarmupCalculatorModal from "../components/WarmupCalculatorModal.vue";

const emit = defineEmits(["navigate"]);

const workout = computed(() => activeWorkoutStore.workout);
const elapsedSeconds = computed(() => activeWorkoutStore.elapsedSeconds);

const showAddExerciseModal = ref(false);
const availableExercises = ref<any[]>([]);
const selectedExerciseId = ref("");

const prNotification = ref<{ open: boolean; prTypes: string[] }>({
  open: false,
  prTypes: [],
});

const warmupModal = ref<{ open: boolean; targetWeight?: number }>({
  open: false,
  targetWeight: 100,
});

const finishNotes = ref("");
const showFinishModal = ref(false);

const formatDuration = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const fetchAvailableExercises = async () => {
  try {
    const res = await api.get<{ exercises: any[] }>("/api/v1/exercises");
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

const handleAddSet = async (exercise: any) => {
  // Pre-fill weight and reps from previous set if present
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

  const result = await activeWorkoutStore.logSet(exercise.id, {
    set_type: "normal",
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

const handleUpdateSetType = async (setId: string, newType: any) => {
  await activeWorkoutStore.updateSet(setId, { set_type: newType });
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
  emit("navigate", "workouts");
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
          <span>🏋️ {{ workout.total_volume || 0 }} kg total</span>
          <span>💪 {{ workout.set_count || 0 }} sets</span>
        </div>
      </div>
      <ui5-button design="Emphasized" @click="showFinishModal = true">Finish Workout</ui5-button>
    </div>

    <!-- Exercises List -->
    <div class="exercises-list">
      <ui5-card
        v-for="(ex, exIdx) in workout.exercises"
        :key="ex.id"
        class="exercise-card"
      >
        <ui5-card-header
          slot="header"
          :title-text="`${exIdx + 1}. ${ex.exercise_name || 'Exercise'}`"
        >
          <ui5-button
            slot="action"
            design="Transparent"
            @click="handleOpenWarmup(ex.sets[0]?.weight || 100)"
          >
            Warmup Calc
          </ui5-button>
        </ui5-card-header>

        <div class="card-content">
          <!-- Previous Reference Display -->
          <div
            v-if="ex.previousSets && ex.previousSets.length"
            class="previous-reference"
          >
            <span class="ref-title">Last Session Reference (REQ-02):</span>
            <span
              v-for="(ps, pIdx) in ex.previousSets"
              :key="pIdx"
              class="ref-chip"
            >
              {{ ps.weight }}kg × {{ ps.reps }}
            </span>
          </div>

          <!-- Sets Table -->
          <div class="sets-table">
            <div class="table-header">
              <span>SET</span>
              <span>TYPE</span>
              <span>KG</span>
              <span>REPS</span>
              <span>ACTIONS</span>
            </div>

            <div
              v-for="(set, sIdx) in ex.sets"
              :key="set.id"
              class="table-row"
            >
              <span class="set-num">{{ sIdx + 1 }}</span>

              <ui5-select
                class="type-select"
                @change="handleUpdateSetType(set.id, $event.target.selectedOption.value)"
              >
                <ui5-option value="normal" :selected="set.set_type === 'normal'">Normal</ui5-option>
                <ui5-option value="warmup" :selected="set.set_type === 'warmup'">Warmup</ui5-option>
                <ui5-option value="drop" :selected="set.set_type === 'drop'">Drop</ui5-option>
                <ui5-option value="failure" :selected="set.set_type === 'failure'">Failure</ui5-option>
              </ui5-select>

              <ui5-input
                type="Number"
                class="num-input"
                :value="String(set.weight)"
                @change="handleUpdateSetWeight(set.id, Number($event.target.value))"
              />

              <ui5-input
                type="Number"
                class="num-input"
                :value="String(set.reps)"
                @change="handleUpdateSetReps(set.id, Number($event.target.value))"
              />

              <div class="row-actions">
                <ui5-button
                  design="Transparent"
                  @click="handleDeleteSet(set.id)"
                >
                  ✕
                </ui5-button>
              </div>
            </div>
          </div>

          <ui5-button
            design="Transparent"
            class="add-set-btn"
            @click="handleAddSet(ex)"
          >
            + Add Set
          </ui5-button>
        </div>
      </ui5-card>
    </div>

    <!-- Add Exercise Action -->
    <div class="bottom-actions">
      <ui5-button design="Emphasized" @click="handleAddExerciseClick">
        + Add Exercise
      </ui5-button>
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
        <ui5-select class="full-width" @change="selectedExerciseId = $event.target.selectedOption.value">
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

.exercise-card {
  width: 100%;
}

.card-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.previous-reference {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--sapList_Background, #f8f9fa);
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  flex-wrap: wrap;
}

.ref-title {
  color: var(--sapContent_LabelColor, #666);
}

.ref-chip {
  background-color: #e3f2fd;
  color: #0d47a1;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-family: monospace;
}

.sets-table {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.table-header {
  display: grid;
  grid-template-columns: 40px 110px 1fr 1fr 40px;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--sapContent_LabelColor, #666);
  padding: 0 0.25rem;
}

.table-row {
  display: grid;
  grid-template-columns: 40px 110px 1fr 1fr 40px;
  gap: 0.5rem;
  align-items: center;
}

.set-num {
  font-weight: bold;
  text-align: center;
  font-size: 0.9rem;
}

.num-input {
  width: 100%;
}

.type-select {
  width: 100%;
}

.row-actions {
  display: flex;
  justify-content: center;
}

.add-set-btn {
  align-self: flex-start;
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
