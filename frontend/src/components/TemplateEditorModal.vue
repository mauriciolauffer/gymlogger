<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import "@ui5/webcomponents/dist/Dialog.js";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Label.js";
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/Option.js";
import "@ui5/webcomponents/dist/MessageStrip.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/ListItemStandard.js";

import { api } from "../api/client";

const props = defineProps<{
  open: boolean;
  template: any | null; // null for create mode
}>();

const emit = defineEmits(["close", "saved"]);

const title = ref("");
const notes = ref("");
const selectedExercises = ref<Array<{ exercise_id: string; name: string }>>([]);
const availableExercises = ref<any[]>([]);
const selectedExerciseToAdd = ref("");
const errorMsg = ref("");
const loading = ref(false);

const fetchAvailableExercises = async () => {
  try {
    const res = await api.get<{ exercises: any[] }>("/api/v1/exercises");
    availableExercises.value = res.exercises || [];
  } catch (err) {
    console.error("Failed to load exercises", err);
  }
};

watch(
  () => props.template,
  (tpl) => {
    if (tpl) {
      title.value = tpl.title || "";
      notes.value = tpl.notes || "";
      selectedExercises.value = (tpl.exercises || []).map((e: any) => ({
        exercise_id: e.exercise_id,
        name: e.exercise_name || e.name || "Exercise",
      }));
    } else {
      title.value = "";
      notes.value = "";
      selectedExercises.value = [];
    }
  },
  { immediate: true }
);

onMounted(() => {
  fetchAvailableExercises();
});

const handleAddExercise = () => {
  if (!selectedExerciseToAdd.value) return;
  const ex = availableExercises.value.find((e) => e.id === selectedExerciseToAdd.value);
  if (ex) {
    selectedExercises.value.push({
      exercise_id: ex.id,
      name: ex.name,
    });
  }
  selectedExerciseToAdd.value = "";
};

const handleRemoveExercise = (index: number) => {
  selectedExercises.value.splice(index, 1);
};

const handleSave = async () => {
  errorMsg.value = "";
  if (!title.value.trim()) {
    errorMsg.value = "Template title is required.";
    return;
  }
  if (!selectedExercises.value.length) {
    errorMsg.value = "At least one exercise is required.";
    return;
  }

  loading.value = true;
  const payload = {
    title: title.value.trim(),
    notes: notes.value.trim() || undefined,
    exercises: selectedExercises.value.map((e, idx) => ({
      exercise_id: e.exercise_id,
      order_index: idx,
    })),
  };

  try {
    if (props.template && props.template.id) {
      await api.put(`/api/v1/workout-templates/${props.template.id}`, payload);
    } else {
      await api.post("/api/v1/workout-templates", payload);
    }
    emit("saved");
    emit("close");
  } catch (err: any) {
    errorMsg.value = err.message || "Failed to save template.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <ui5-dialog
    :open="open"
    :header-text="template ? 'Edit Template' : 'Create Template'"
    @close="emit('close')"
  >
    <div class="dialog-content">
      <ui5-message-strip v-if="errorMsg" design="Negative" @close="errorMsg = ''">
        {{ errorMsg }}
      </ui5-message-strip>

      <div class="form-group">
        <ui5-label required>Template Title</ui5-label>
        <ui5-input :value="title" @input="title = $event.target.value" placeholder="e.g. Upper Body Hypertrophy" />
      </div>

      <div class="form-group">
        <ui5-label>Notes / Description</ui5-label>
        <ui5-input :value="notes" @input="notes = $event.target.value" placeholder="Focus on progressive overload..." />
      </div>

      <div class="form-group">
        <ui5-label>Add Exercise</ui5-label>
        <div class="add-row">
          <ui5-select class="flex-1" @change="selectedExerciseToAdd = $event.target.selectedOption.value">
            <ui5-option value="">Choose Exercise</ui5-option>
            <ui5-option
              v-for="ex in availableExercises"
              :key="ex.id"
              :value="ex.id"
              :selected="selectedExerciseToAdd === ex.id"
            >
              {{ ex.name }}
            </ui5-option>
          </ui5-select>
          <ui5-button design="Emphasized" @click="handleAddExercise">Add</ui5-button>
        </div>
      </div>

      <div class="form-group">
        <ui5-label>Selected Exercises ({{ selectedExercises.length }})</ui5-label>
        <ui5-list v-if="selectedExercises.length">
          <ui5-list-item-standard
            v-for="(ex, idx) in selectedExercises"
            :key="idx"
          >
            {{ idx + 1 }}. {{ ex.name }}
            <ui5-button slot="endContent" design="Transparent" icon="delete" @click="handleRemoveExercise(idx)">Remove</ui5-button>
          </ui5-list-item-standard>
        </ui5-list>
        <p v-else class="empty-text">No exercises added to template yet.</p>
      </div>
    </div>

    <div slot="footer" class="dialog-footer">
      <ui5-button design="Transparent" @click="emit('close')">Cancel</ui5-button>
      <ui5-button design="Emphasized" :disabled="loading" @click="handleSave">
        {{ loading ? 'Saving...' : 'Save Template' }}
      </ui5-button>
    </div>
  </ui5-dialog>
</template>

<style scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 0;
  width: 440px;
  max-width: 100%;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.add-row {
  display: flex;
  gap: 0.5rem;
}

.flex-1 {
  flex: 1;
}

.empty-text {
  color: var(--sapContent_LabelColor, #666);
  font-style: italic;
  font-size: 0.9rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
}
</style>
