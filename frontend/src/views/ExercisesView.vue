<script setup lang="ts">
import { ref, onMounted } from "vue";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/ListItemStandard.js";
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/Option.js";

import { api } from "../api/client";
import CreateExerciseModal from "../components/CreateExerciseModal.vue";
import ExerciseDetailModal from "../components/ExerciseDetailModal.vue";

const exercises = ref<any[]>([]);
const muscleGroups = ref<any[]>([]);
const searchQuery = ref("");
const selectedCategory = ref("");
const selectedMuscleGroup = ref("");
const showCustomOnly = ref(false);
const loading = ref(false);

const showCreateModal = ref(false);
const selectedExerciseForDetail = ref<any | null>(null);

const fetchMuscleGroups = async () => {
  try {
    const res = await api.get<{ muscleGroups: any[] }>("/api/v1/muscle-groups");
    muscleGroups.value = res.muscleGroups || [];
  } catch (err) {
    console.error("Failed to fetch muscle groups", err);
  }
};

const fetchExercises = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (searchQuery.value) params.append("q", searchQuery.value);
    if (selectedCategory.value) params.append("category", selectedCategory.value);
    if (selectedMuscleGroup.value) params.append("muscleGroupId", selectedMuscleGroup.value);
    if (showCustomOnly.value) params.append("custom", "true");

    const res = await api.get<{ exercises: any[] }>(`/api/v1/exercises?${params.toString()}`);
    exercises.value = res.exercises || [];
  } catch (err) {
    console.error("Failed to fetch exercises", err);
  } finally {
    loading.value = false;
  }
};

const handleSearchInput = (e: any) => {
  searchQuery.value = e.target.value;
  fetchExercises();
};

const handleCategoryChange = (e: any) => {
  selectedCategory.value = e.target.selectedOption.value;
  fetchExercises();
};

const handleMuscleGroupChange = (e: any) => {
  selectedMuscleGroup.value = e.target.selectedOption.value;
  fetchExercises();
};

const handleExerciseClick = (ex: any) => {
  selectedExerciseForDetail.value = ex;
};

const handleExerciseCreated = (newEx: any) => {
  fetchExercises();
};

onMounted(() => {
  fetchMuscleGroups();
  fetchExercises();
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

      <ui5-select class="filter-select" @change="handleCategoryChange">
        <ui5-option value="">All Categories</ui5-option>
        <ui5-option value="barbell">Barbell</ui5-option>
        <ui5-option value="dumbbell">Dumbbell</ui5-option>
        <ui5-option value="machine">Machine</ui5-option>
        <ui5-option value="cable">Cable</ui5-option>
        <ui5-option value="bodyweight">Bodyweight</ui5-option>
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
          :description="[ex.category, ex.primary_muscle_name].filter(Boolean).join(' • ')"
          @click="handleExerciseClick(ex)"
        >
          {{ ex.name }}
        </ui5-list-item-standard>
      </ui5-list>
      <div v-else class="empty-state">
        No exercises found matching criteria.
      </div>
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
