<script setup lang="ts">
import { ref, shallowRef, watch, onMounted } from "vue";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/ListItemStandard.js";
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/Option.js";

import { client } from "../api/client";
import type { MuscleGroupsRes, ExercisesRes } from "../api/types";
import CreateExerciseModal from "../components/CreateExerciseModal.vue";
import ExerciseDetailModal from "../components/ExerciseDetailModal.vue";

interface Exercise {
  id: string;
  name: string;
  category?: string;
  muscleGroupName?: string;
  equipment?: string;
}

interface MuscleGroup {
  id: string;
  name: string;
}

const exercises = ref<Exercise[]>([]);
const muscleGroups = ref<MuscleGroup[]>([]);
const searchQuery = shallowRef("");
const selectedMuscleGroup = shallowRef("");
const selectedEquipment = shallowRef("");
const showCustomOnly = shallowRef(false);
const loading = shallowRef(false);

const showCreateModal = shallowRef(false);
const selectedExerciseForDetail = ref<Exercise | null>(null);

const fetchMuscleGroups = async () => {
  try {
    const res = (await (await client.api.v1["muscle-groups"].$get()).json()) as MuscleGroupsRes;
    muscleGroups.value = res.muscleGroups || [];
  } catch (err) {
    console.error("Failed to fetch muscle groups", err);
  }
};

const fetchExercises = async () => {
  loading.value = true;
  try {
    const queryObj: Record<string, string> = {};
    if (searchQuery.value) queryObj.q = searchQuery.value;
    if (selectedEquipment.value) queryObj.equipment = selectedEquipment.value;
    if (selectedMuscleGroup.value) queryObj.muscleGroupId = selectedMuscleGroup.value;
    if (showCustomOnly.value) queryObj.custom = "true";

    const res = (await (
      await client.api.v1.exercises.$get({ query: queryObj })
    ).json()) as ExercisesRes;
    exercises.value = res.exercises || [];
  } catch (err) {
    console.error("Failed to fetch exercises", err);
  } finally {
    loading.value = false;
  }
};

const handleSearchInput = (e: Event) => {
  searchQuery.value = (e.target as HTMLInputElement).value;
};

const handleEquipmentChange = (e: Event) => {
  const select = e.target as HTMLElement & { selectedOption: { value: string } };
  selectedEquipment.value = select.selectedOption.value;
};

const handleMuscleGroupChange = (e: Event) => {
  const select = e.target as HTMLElement & { selectedOption: { value: string } };
  selectedMuscleGroup.value = select.selectedOption.value;
};

const handleExerciseClick = (ex: Exercise) => {
  selectedExerciseForDetail.value = ex;
};

const handleExerciseCreated = (_newEx: Exercise) => {
  fetchExercises();
};

watch([searchQuery, selectedMuscleGroup, selectedEquipment, showCustomOnly], fetchExercises, {
  immediate: true,
});

onMounted(() => {
  fetchMuscleGroups();
});
</script>

<template>
  <div class="exercises-container">
    <div class="header-actions">
      <ui5-title level="H2">Exercise Library</ui5-title>
      <ui5-button design="Emphasized" @click="showCreateModal = true">
        + Create Custom Exercise
      </ui5-button>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <ui5-input
        placeholder="Search exercises..."
        :value="searchQuery"
        class="search-input"
        @input="handleSearchInput"
      />

      <ui5-select class="filter-select" @change="handleEquipmentChange">
        <ui5-option value="">All Equipment</ui5-option>
        <ui5-option value="barbell">Barbell</ui5-option>
        <ui5-option value="dumbbell">Dumbbell</ui5-option>
        <ui5-option value="machine">Machine</ui5-option>
        <ui5-option value="cable">Cable</ui5-option>
        <ui5-option value="body weight">Bodyweight</ui5-option>
      </ui5-select>

      <ui5-select class="filter-select" @change="handleMuscleGroupChange">
        <ui5-option value="">All Muscle Groups</ui5-option>
        <ui5-option v-for="mg in muscleGroups" :key="mg.id" :value="mg.id">
          {{ mg.name }}
        </ui5-option>
      </ui5-select>
    </div>

    <!-- Exercise List -->
    <ui5-card class="list-card">
      <div v-if="loading" class="loading-state">Loading exercises...</div>
      <ui5-list v-else-if="exercises.length">
        <ui5-list-item-standard
          v-for="ex in exercises"
          :key="ex.id"
          :description="[ex.category, ex.muscleGroupName].filter(Boolean).join(' • ')"
          @click="handleExerciseClick(ex)"
        >
          {{ ex.name }}
        </ui5-list-item-standard>
      </ui5-list>
      <div v-else class="empty-state">No exercises found matching criteria.</div>
    </ui5-card>

    <!-- Modals -->
    <CreateExerciseModal
      :open="showCreateModal"
      :muscle-groups="muscleGroups"
      @close="showCreateModal = false"
      @created="handleExerciseCreated"
    />

    <ExerciseDetailModal
      :open="!!selectedExerciseForDetail"
      :exercise="selectedExerciseForDetail"
      @close="selectedExerciseForDetail = null"
    />
  </div>
</template>

<style scoped>
.exercises-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
}

.filter-select {
  min-width: 160px;
}

.list-card {
  width: 100%;
}

.loading-state,
.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--sapContent_LabelColor, #666);
}
</style>
