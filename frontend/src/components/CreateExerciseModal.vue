<script setup lang="ts">
import { ref } from "vue";
import "@ui5/webcomponents/dist/Dialog.js";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Label.js";
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/Option.js";
import "@ui5/webcomponents/dist/MessageStrip.js";

import { api } from "../api/client";

const props = defineProps<{
  open: boolean;
  muscleGroups: Array<{ id: string; name: string }>;
}>();

const emit = defineEmits(["close", "created"]);

const name = ref("");
const category = ref("barbell");
const equipment = ref("barbell");
const target = ref("");
const muscleGroupId = ref("");
const errorMsg = ref("");
const loading = ref(false);

const handleCreate = async () => {
  errorMsg.value = "";
  if (!name.value.trim()) {
    errorMsg.value = "Exercise name is required.";
    return;
  }

  loading.value = true;
  try {
    const res = await api.post("/api/v1/exercises", {
      name: name.value.trim(),
      category: category.value,
      equipment: equipment.value,
      target: target.value || undefined,
      muscle_group_id: muscleGroupId.value || undefined,
    });
    emit("created", res.exercise);
    handleClose();
  } catch (err: any) {
    errorMsg.value = err.message || "Failed to create exercise.";
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  name.value = "";
  errorMsg.value = "";
  emit("close");
};
</script>

<template>
  <ui5-dialog :open="open" header-text="Create Custom Exercise" @close="handleClose">
    <div class="dialog-content">
      <ui5-message-strip v-if="errorMsg" design="Negative" @close="errorMsg = ''">
        {{ errorMsg }}
      </ui5-message-strip>

      <div class="form-group">
        <ui5-label required>Exercise Name</ui5-label>
        <ui5-input :value="name" @input="name = $event.target.value" placeholder="e.g. Incline Cable Fly" />
      </div>

      <div class="form-group">
        <ui5-label>Category</ui5-label>
        <ui5-select @change="category = $event.target.selectedOption.value">
          <ui5-option value="barbell" :selected="category === 'barbell'">Barbell</ui5-option>
          <ui5-option value="dumbbell" :selected="category === 'dumbbell'">Dumbbell</ui5-option>
          <ui5-option value="machine" :selected="category === 'machine'">Machine</ui5-option>
          <ui5-option value="cable" :selected="category === 'cable'">Cable</ui5-option>
          <ui5-option value="bodyweight" :selected="category === 'bodyweight'">Bodyweight</ui5-option>
          <ui5-option value="other" :selected="category === 'other'">Other</ui5-option>
        </ui5-select>
      </div>

      <div class="form-group">
        <ui5-label>Primary Muscle Group</ui5-label>
        <ui5-select @change="muscleGroupId = $event.target.selectedOption.value">
          <ui5-option value="">Select Primary Muscle</ui5-option>
          <ui5-option
            v-for="mg in muscleGroups"
            :key="mg.id"
            :value="mg.id"
            :selected="muscleGroupId === mg.id"
          >
            {{ mg.name }}
          </ui5-option>
        </ui5-select>
      </div>

      <div class="form-group">
        <ui5-label>Target Muscle / Body Part</ui5-label>
        <ui5-input :value="target" @input="target = $event.target.value" placeholder="e.g. Upper Chest" />
      </div>
    </div>

    <div slot="footer" class="dialog-footer">
      <ui5-button design="Transparent" @click="handleClose">Cancel</ui5-button>
      <ui5-button design="Emphasized" :disabled="loading" @click="handleCreate">
        {{ loading ? 'Creating...' : 'Create' }}
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
  width: 360px;
  max-width: 100%;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
}
</style>
