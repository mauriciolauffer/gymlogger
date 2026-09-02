<script setup lang="ts">
import { ref, watch } from "vue";
import "@ui5/webcomponents/dist/Dialog.js";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Label.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/ListItemStandard.js";

import { api } from "../api/client";

const props = defineProps<{
  open: boolean;
  targetWeight?: number;
}>();

const emit = defineEmits(["close"]);

const weightInput = ref(props.targetWeight ? String(props.targetWeight) : "100");
const loading = ref(false);
const warmupSets = ref<Array<{ percentage: number; weight: number; reps: number; notes: string }>>([]);

const fetchWarmup = async (w: number) => {
  if (!w || w <= 0) return;
  loading.value = true;
  try {
    const data = await api.get<{ warmupSets: any[] }>(`/api/v1/calculators/warmup?targetWeight=${w}`);
    warmupSets.value = data.warmupSets || [];
  } catch (err) {
    console.error("Failed to calculate warmups", err);
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      if (props.targetWeight) {
        weightInput.value = String(props.targetWeight);
      }
      fetchWarmup(Number(weightInput.value));
    }
  }
);

const handleCalculate = () => {
  fetchWarmup(Number(weightInput.value));
};
</script>

<template>
  <ui5-dialog :open="open" header-text="Warm-up Calculator" @close="emit('close')">
    <div class="dialog-content">
      <div class="form-group">
        <ui5-label>Working Target Weight (kg)</ui5-label>
        <div class="calc-row">
          <ui5-input
            type="Number"
            :value="weightInput"
            @input="weightInput = $event.target.value"
            placeholder="100"
          />
          <ui5-button design="Emphasized" @click="handleCalculate">Calculate</ui5-button>
        </div>
      </div>

      <div class="results" v-if="warmupSets.length">
        <ui5-label>Suggested Warm-Up Progression</ui5-label>
        <ui5-list>
          <ui5-list-item-standard
            v-for="(set, idx) in warmupSets"
            :key="idx"
            :description="`${set.percentage}% of working weight - ${set.notes}`"
          >
            Set {{ idx + 1 }}: {{ set.weight }} kg × {{ set.reps }} reps
          </ui5-list-item-standard>
        </ui5-list>
      </div>
    </div>

    <div slot="footer" class="dialog-footer">
      <ui5-button design="Transparent" @click="emit('close')">Close</ui5-button>
    </div>
  </ui5-dialog>
</template>

<style scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem 0;
  width: 380px;
  max-width: 100%;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.calc-row {
  display: flex;
  gap: 0.5rem;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem 1rem;
}
</style>
