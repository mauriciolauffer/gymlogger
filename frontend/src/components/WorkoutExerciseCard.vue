<script setup lang="ts">
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/Option.js";

import type { ActiveWorkoutExercise } from "../store/activeWorkout.ts";
import { SET_TYPE } from "../db/constants.js";

const props = defineProps<{
  exercise: ActiveWorkoutExercise;
  index: number;
}>();

const emit = defineEmits<{
  "add-set": [exerciseId: string];
  "update-set-weight": [setId: string, weight: number];
  "update-set-reps": [setId: string, reps: number];
  "update-set-type": [setId: string, type: string];
  "delete-set": [setId: string];
  "open-warmup": [targetWeight: number];
}>();
</script>

<template>
  <ui5-card class="exercise-card">
    <ui5-card-header
      slot="header"
      :title-text="`${props.index + 1}. ${props.exercise.exerciseName || 'Exercise'}`"
    >
      <ui5-button
        slot="action"
        design="Transparent"
        @click="emit('open-warmup', props.exercise.sets[0]?.weight || 100)"
      >
        Warmup Calc
      </ui5-button>
    </ui5-card-header>

    <div class="card-content">
      <div
        v-if="props.exercise.previousSets && props.exercise.previousSets.length"
        class="previous-reference"
      >
        <span class="ref-title">Last Session:</span>
        <span v-for="(ps, pIdx) in props.exercise.previousSets" :key="pIdx" class="ref-chip">
          {{ ps.weight }}kg × {{ ps.reps }}
        </span>
      </div>

      <div class="sets-table">
        <div class="table-header">
          <span>SET</span>
          <span>TYPE</span>
          <span>KG</span>
          <span>REPS</span>
          <span>ACTIONS</span>
        </div>

        <div v-for="(set, sIdx) in props.exercise.sets" :key="set.id" class="table-row">
          <span class="set-num">{{ sIdx + 1 }}</span>

          <ui5-select
            class="type-select"
            @change="emit('update-set-type', set.id, $event.target.selectedOption.value)"
          >
            <ui5-option
              v-for="[code, { label }] in SET_TYPE"
              :key="code"
              :value="code"
              :selected="set.setType === code"
              >{{ label }}</ui5-option
            >
          </ui5-select>

          <ui5-input
            type="Number"
            class="num-input"
            :value="String(set.weight)"
            @change="emit('update-set-weight', set.id, Number($event.target.value))"
          />

          <ui5-input
            type="Number"
            class="num-input"
            :value="String(set.reps)"
            @change="emit('update-set-reps', set.id, Number($event.target.value))"
          />

          <div class="row-actions">
            <ui5-button design="Transparent" @click="emit('delete-set', set.id)"> ✕ </ui5-button>
          </div>
        </div>
      </div>

      <ui5-button
        design="Transparent"
        class="add-set-btn"
        @click="emit('add-set', props.exercise.id)"
      >
        + Add Set
      </ui5-button>
    </div>
  </ui5-card>
</template>

<style scoped>
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
</style>
