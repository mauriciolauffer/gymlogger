<script setup lang="ts">
import { ref, watch } from "vue";
import "@ui5/webcomponents/dist/Dialog.js";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/ListItemStandard.js";
import "@ui5/webcomponents/dist/MessageStrip.js";
import "@ui5/webcomponents/dist/Panel.js";

import { api } from "../api/client";

const props = defineProps<{
  open: boolean;
  exercise: any | null;
}>();

const emit = defineEmits(["close"]);

const loading = ref(false);
const analyticsData = ref<{
  oneRmCurve: Array<{ date: string; value: number }>;
  maxWeightCurve: Array<{ date: string; value: number }>;
  maxRepsCurve: Array<{ date: string; value: number }>;
  sessions: Array<{ workout_id: string; title: string; start_time: string; set_count: number }>;
} | null>(null);

const errorMsg = ref("");

const fetchPerformance = async (exerciseId: string) => {
  loading.value = true;
  errorMsg.value = "";
  try {
    const data = await api.get(`/api/v1/analytics/performance?exerciseId=${exerciseId}`);
    analyticsData.value = data;
  } catch (err: any) {
    errorMsg.value = err.message || "Failed to load exercise performance curves.";
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.exercise,
  (newEx) => {
    if (newEx && newEx.id) {
      fetchPerformance(newEx.id);
    }
  },
  { immediate: true }
);

const formatDate = (iso: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
</script>

<template>
  <ui5-dialog
    :open="open"
    :header-text="exercise ? exercise.name : 'Exercise Detail'"
    @close="emit('close')"
  >
    <div class="dialog-content" v-if="exercise">
      <div class="exercise-meta">
        <span class="badge">{{ exercise.category || 'General' }}</span>
        <span class="badge" v-if="exercise.primary_muscle_name">{{ exercise.primary_muscle_name }}</span>
      </div>

      <ui5-message-strip v-if="errorMsg" design="Negative" @close="errorMsg = ''">
        {{ errorMsg }}
      </ui5-message-strip>

      <div v-if="loading" class="loading">Loading performance metrics...</div>

      <div v-else-if="analyticsData" class="analytics-container">
        <!-- 1RM Progression Curve -->
        <ui5-panel header-text="1RM Progression Curve (REQ-05)" collapsed="false">
          <div class="curve-list" v-if="analyticsData.oneRmCurve?.length">
            <div
              v-for="(point, idx) in analyticsData.oneRmCurve"
              :key="idx"
              class="curve-point"
            >
              <span class="date">{{ formatDate(point.date) }}</span>
              <span class="val">{{ point.value }} kg</span>
            </div>
          </div>
          <p v-else class="empty-text">No 1RM data recorded yet.</p>
        </ui5-panel>

        <!-- Max Weight Progression -->
        <ui5-panel header-text="Max Weight Curve" collapsed="true">
          <div class="curve-list" v-if="analyticsData.maxWeightCurve?.length">
            <div
              v-for="(point, idx) in analyticsData.maxWeightCurve"
              :key="idx"
              class="curve-point"
            >
              <span class="date">{{ formatDate(point.date) }}</span>
              <span class="val">{{ point.value }} kg</span>
            </div>
          </div>
          <p v-else class="empty-text">No max weight data recorded yet.</p>
        </ui5-panel>

        <!-- Chronological Session History -->
        <ui5-panel header-text="Chronological Session History" collapsed="false">
          <ui5-list v-if="analyticsData.sessions?.length">
            <ui5-list-item-standard
              v-for="s in analyticsData.sessions"
              :key="s.workout_id"
              :description="formatDate(s.start_time)"
            >
              {{ s.title }} ({{ s.set_count }} sets)
            </ui5-list-item-standard>
          </ui5-list>
          <p v-else class="empty-text">No past sessions found for this exercise.</p>
        </ui5-panel>
      </div>
    </div>

    <div slot="footer" class="dialog-footer">
      <ui5-button design="Emphasized" @click="emit('close')">Close</ui5-button>
    </div>
  </ui5-dialog>
</template>

<style scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 0;
  width: 500px;
  max-width: 100%;
}

.exercise-meta {
  display: flex;
  gap: 0.5rem;
}

.badge {
  background-color: var(--sapList_Background, #f0f0f0);
  border: 1px solid var(--sapList_BorderColor, #ccc);
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.85rem;
  text-transform: capitalize;
}

.analytics-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.curve-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.curve-point {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0.8rem;
  background-color: var(--sapList_Background, #fafafa);
  border-radius: 4px;
  font-size: 0.9rem;
}

.val {
  font-weight: bold;
  color: var(--sapBrandColor, #0a6ed1);
}

.empty-text {
  color: var(--sapContent_LabelColor, #666);
  font-style: italic;
  padding: 0.5rem;
}

.loading {
  padding: 1.5rem;
  text-align: center;
  color: var(--sapContent_LabelColor, #666);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem 1rem;
}
</style>
