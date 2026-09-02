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

defineProps<{
  open: boolean;
}>();

const emit = defineEmits(["close", "saved"]);

const weight = ref("");
const weightUnit = ref("kg");
const bodyFatPct = ref("");
const chest = ref("");
const waist = ref("");
const biceps = ref("");
const thighs = ref("");
const circumferenceUnit = ref("cm");
const photoUrl = ref("");

const loading = ref(false);
const errorMsg = ref("");

const handleSave = async () => {
  errorMsg.value = "";
  if (!weight.value && !bodyFatPct.value && !chest.value && !waist.value) {
    errorMsg.value = "Please enter at least one measurement metric.";
    return;
  }

  loading.value = true;
  try {
    await api.post("/api/v1/body-measurements", {
      weight: weight.value ? Number(weight.value) : undefined,
      weight_unit: weightUnit.value,
      body_fat_pct: bodyFatPct.value ? Number(bodyFatPct.value) : undefined,
      chest: chest.value ? Number(chest.value) : undefined,
      waist: waist.value ? Number(waist.value) : undefined,
      biceps: biceps.value ? Number(biceps.value) : undefined,
      thighs: thighs.value ? Number(thighs.value) : undefined,
      circumference_unit: circumferenceUnit.value,
      photo_url: photoUrl.value || undefined,
    });
    emit("saved");
    emit("close");
  } catch (err: any) {
    errorMsg.value = err.message || "Failed to log measurement.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <ui5-dialog :open="open" header-text="Log Body Measurements" @close="emit('close')">
    <div class="dialog-content">
      <ui5-message-strip v-if="errorMsg" design="Negative" @close="errorMsg = ''">
        {{ errorMsg }}
      </ui5-message-strip>

      <div class="form-grid">
        <div class="form-group">
          <ui5-label>Body Weight</ui5-label>
          <div class="row-inputs">
            <ui5-input type="Number" :value="weight" @input="weight = $event.target.value" placeholder="75.0" />
            <ui5-select @change="weightUnit = $event.target.selectedOption.value">
              <ui5-option value="kg" :selected="weightUnit === 'kg'">kg</ui5-option>
              <ui5-option value="lb" :selected="weightUnit === 'lb'">lb</ui5-option>
            </ui5-select>
          </div>
        </div>

        <div class="form-group">
          <ui5-label>Body Fat %</ui5-label>
          <ui5-input type="Number" :value="bodyFatPct" @input="bodyFatPct = $event.target.value" placeholder="15.0" />
        </div>
      </div>

      <div class="section-title">Circumferences</div>
      <div class="form-group">
        <ui5-label>Unit</ui5-label>
        <ui5-select @change="circumferenceUnit = $event.target.selectedOption.value">
          <ui5-option value="cm" :selected="circumferenceUnit === 'cm'">Centimeters (cm)</ui5-option>
          <ui5-option value="in" :selected="circumferenceUnit === 'in'">Inches (in)</ui5-option>
        </ui5-select>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <ui5-label>Chest</ui5-label>
          <ui5-input type="Number" :value="chest" @input="chest = $event.target.value" placeholder="100" />
        </div>

        <div class="form-group">
          <ui5-label>Waist</ui5-label>
          <ui5-input type="Number" :value="waist" @input="waist = $event.target.value" placeholder="80" />
        </div>

        <div class="form-group">
          <ui5-label>Biceps</ui5-label>
          <ui5-input type="Number" :value="biceps" @input="biceps = $event.target.value" placeholder="38" />
        </div>

        <div class="form-group">
          <ui5-label>Thighs</ui5-label>
          <ui5-input type="Number" :value="thighs" @input="thighs = $event.target.value" placeholder="60" />
        </div>
      </div>

      <div class="form-group">
        <ui5-label>Progress Photo URL (Optional - REQ-10)</ui5-label>
        <ui5-input :value="photoUrl" @input="photoUrl = $event.target.value" placeholder="https://example.com/photo.jpg" />
      </div>
    </div>

    <div slot="footer" class="dialog-footer">
      <ui5-button design="Transparent" @click="emit('close')">Cancel</ui5-button>
      <ui5-button design="Emphasized" :disabled="loading" @click="handleSave">
        {{ loading ? 'Saving...' : 'Save Log' }}
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
  width: 420px;
  max-width: 100%;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.row-inputs {
  display: flex;
  gap: 0.5rem;
}

.section-title {
  font-weight: bold;
  font-size: 0.9rem;
  color: var(--sapBrandColor, #0a6ed1);
  margin-top: 0.5rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
}
</style>
