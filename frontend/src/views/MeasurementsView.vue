<script setup lang="ts">
import { ref, onMounted } from "vue";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/ListItemStandard.js";

import { api } from "../api/client";
import LogMeasurementModal from "../components/LogMeasurementModal.vue";

const logs = ref<any[]>([]);
const loading = ref(false);
const showLogModal = ref(false);

const fetchMeasurements = async () => {
  loading.value = true;
  try {
    const res = await api.get<{ measurements: any[] }>("/api/v1/body-measurements");
    logs.value = res.measurements || [];
  } catch (err) {
    console.error("Failed to fetch body measurements", err);
  } finally {
    loading.value = false;
  }
};

const handleDelete = async (id: string, event: Event) => {
  event.stopPropagation();
  if (!confirm("Are you sure you want to delete this measurement entry?")) return;
  try {
    await api.delete(`/api/v1/body-measurements/${id}`);
    fetchMeasurements();
  } catch (err) {
    console.error("Failed to delete measurement", err);
  }
};

const formatDate = (iso: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatMetrics = (item: any) => {
  const parts: string[] = [];
  if (item.weight) parts.push(`Weight: ${item.weight} ${item.weight_unit || 'kg'}`);
  if (item.body_fat_pct) parts.push(`Body Fat: ${item.body_fat_pct}%`);
  if (item.chest) parts.push(`Chest: ${item.chest}${item.circumference_unit || 'cm'}`);
  if (item.waist) parts.push(`Waist: ${item.waist}${item.circumference_unit || 'cm'}`);
  if (item.biceps) parts.push(`Biceps: ${item.biceps}${item.circumference_unit || 'cm'}`);
  if (item.thighs) parts.push(`Thighs: ${item.thighs}${item.circumference_unit || 'cm'}`);
  return parts.join(" • ");
};

onMounted(() => {
  fetchMeasurements();
});
</script>

<template>
  <div class="measurements-container">
    <div class="header-actions">
      <div>
        <ui5-title level="H2">Body Measurements & Progress</ui5-title>
        <p class="subtitle">Track composition changes over time (REQ-07, REQ-09, REQ-10)</p>
      </div>
      <ui5-button design="Emphasized" @click="showLogModal = true">
        + Log Measurement
      </ui5-button>
    </div>

    <div v-if="loading" class="loading-state">Loading measurements...</div>

    <div v-else-if="logs.length" class="logs-list">
      <ui5-card v-for="item in logs" :key="item.id" class="log-card">
        <ui5-card-header
          slot="header"
          :title-text="formatDate(item.created_at || item.recorded_at)"
          :subtitle-text="formatMetrics(item)"
        >
          <ui5-button
            slot="action"
            design="Transparent"
            icon="delete"
            @click="handleDelete(item.id, $event)"
          >
            Delete
          </ui5-button>
        </ui5-card-header>

        <div class="card-content" v-if="item.photo_url">
          <div class="photo-preview">
            <img :src="item.photo_url" alt="Progress Photo" class="progress-photo" />
          </div>
        </div>
      </ui5-card>
    </div>

    <div v-else class="empty-state">
      <p>No body measurements logged yet. Click "+ Log Measurement" to record your metrics!</p>
    </div>

    <LogMeasurementModal
      :open="showLogModal"
      @close="showLogModal = false"
      @saved="fetchMeasurements"
    />
  </div>
</template>

<style scoped>
.measurements-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.subtitle {
  color: var(--sapContent_LabelColor, #666);
  font-size: 0.9rem;
  margin-top: 0.2rem;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.log-card {
  width: 100%;
}

.card-content {
  padding: 1rem;
}

.photo-preview {
  display: flex;
  justify-content: flex-start;
}

.progress-photo {
  max-width: 200px;
  max-height: 200px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid var(--sapList_BorderColor, #e0e0e0);
}

.loading-state,
.empty-state {
  padding: 3rem;
  text-align: center;
  color: var(--sapContent_LabelColor, #666);
}
</style>
