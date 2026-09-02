<script setup lang="ts">
import { ref, onMounted } from "vue";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/ListItemStandard.js";
import "@ui5/webcomponents/dist/Panel.js";
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/Option.js";

import { api } from "../api/client";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const selectedYear = ref(currentYear);
const selectedMonth = ref(currentMonth);

const loading = ref(false);
const report = ref<{
  totalWorkouts: number;
  totalVolume: number;
  totalDurationSeconds: number;
  topPrs: Array<{ exercise_name: string; pr_type: string; value: number }>;
  muscleDistribution: Array<{ muscle_name: string; set_count: number; percentage: number }>;
  weeklyMuscleTargetProgress: Array<{ muscle_name: string; weekly_sets: number; target_min: number; target_max: number }>;
} | null>(null);

const consistencyData = ref<any>(null);
const yearInReview = ref<any>(null);

const months = [
  { value: 1, name: "January" },
  { value: 2, name: "February" },
  { value: 3, name: "March" },
  { value: 4, name: "April" },
  { value: 5, name: "May" },
  { value: 6, name: "June" },
  { value: 7, name: "July" },
  { value: 8, name: "August" },
  { value: 9, name: "September" },
  { value: 10, name: "October" },
  { value: 11, name: "November" },
  { value: 12, name: "December" },
];

const fetchAnalytics = async () => {
  loading.value = true;
  try {
    const reportData = await api.get(
      `/api/v1/analytics/monthly-report?year=${selectedYear.value}&month=${selectedMonth.value}`
    );
    report.value = reportData;

    const consistencyRes = await api.get("/api/v1/analytics/consistency");
    consistencyData.value = consistencyRes;

    const yearRes = await api.get(`/api/v1/analytics/year-in-review?year=${selectedYear.value}`);
    yearInReview.value = yearRes;
  } catch (err) {
    console.error("Failed to load analytics report", err);
  } finally {
    loading.value = false;
  }
};

const handleMonthChange = (e: any) => {
  selectedMonth.value = Number(e.target.selectedOption.value);
  fetchAnalytics();
};

const handleYearChange = (e: any) => {
  selectedYear.value = Number(e.target.selectedOption.value);
  fetchAnalytics();
};

const formatDurationHours = (secs: number) => {
  if (!secs) return "0.0 hrs";
  return `${(secs / 3600).toFixed(1)} hrs`;
};

onMounted(() => {
  fetchAnalytics();
});
</script>

<template>
  <div class="analytics-container">
    <!-- Header with Date Filters -->
    <div class="header-bar">
      <div>
        <ui5-title level="H2">Monthly Report & Analytics</ui5-title>
        <p class="subtitle">Periodic training progress summary (REQ-06)</p>
      </div>

      <div class="filter-controls">
        <ui5-select @change="handleMonthChange">
          <ui5-option
            v-for="m in months"
            :key="m.value"
            :value="String(m.value)"
            :selected="selectedMonth === m.value"
          >
            {{ m.name }}
          </ui5-option>
        </ui5-select>

        <ui5-select @change="handleYearChange">
          <ui5-option value="2026" :selected="selectedYear === 2026">2026</ui5-option>
          <ui5-option value="2025" :selected="selectedYear === 2025">2025</ui5-option>
        </ui5-select>
      </div>
    </div>

    <div v-if="loading" class="loading-state">Loading monthly report...</div>

    <div v-else-if="report" class="analytics-grid">
      <!-- High Level Metrics -->
      <div class="metrics-cards">
        <ui5-card class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Total Workouts</span>
            <span class="stat-value">{{ report.totalWorkouts || 0 }}</span>
          </div>
        </ui5-card>

        <ui5-card class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Total Volume</span>
            <span class="stat-value">{{ (report.totalVolume || 0).toLocaleString() }} kg</span>
          </div>
        </ui5-card>

        <ui5-card class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Total Duration</span>
            <span class="stat-value">{{ formatDurationHours(report.totalDurationSeconds) }}</span>
          </div>
        </ui5-card>
      </div>

      <!-- Muscle Group Distribution Split -->
      <ui5-card class="section-card">
        <ui5-card-header slot="header" title-text="Muscle Group Distribution Split" />
        <div class="card-content">
          <div v-if="report.muscleDistribution?.length" class="distribution-list">
            <div
              v-for="item in report.muscleDistribution"
              :key="item.muscle_name"
              class="dist-item"
            >
              <div class="dist-meta">
                <span>{{ item.muscle_name }}</span>
                <span>{{ item.set_count }} sets ({{ item.percentage }}%)</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: item.percentage + '%' }"></div>
              </div>
            </div>
          </div>
          <p v-else class="empty-text">No muscle group distribution data for this month.</p>
        </div>
      </ui5-card>

      <!-- Weekly Sets vs Hypertrophy Target Ranges -->
      <ui5-card class="section-card">
        <ui5-card-header slot="header" title-text="Weekly Sets vs Hypertrophy Targets" />
        <div class="card-content">
          <div v-if="report.weeklyMuscleTargetProgress?.length" class="target-list">
            <div
              v-for="item in report.weeklyMuscleTargetProgress"
              :key="item.muscle_name"
              class="target-item"
            >
              <div class="dist-meta">
                <span>{{ item.muscle_name }}</span>
                <span>
                  {{ item.weekly_sets }} / {{ item.target_min }}-{{ item.target_max }} weekly sets
                </span>
              </div>
              <div class="progress-track">
                <div
                  class="progress-fill target-fill"
                  :style="{ width: Math.min(100, (item.weekly_sets / item.target_max) * 100) + '%' }"
                ></div>
              </div>
            </div>
          </div>
          <p v-else class="empty-text">No weekly set target data available.</p>
        </div>
      </ui5-card>

      <!-- Top PRs Achieved -->
      <ui5-card class="section-card">
        <ui5-card-header slot="header" title-text="Top Personal Records (PRs)" />
        <div class="card-content">
          <ui5-list v-if="report.topPrs?.length">
            <ui5-list-item-standard
              v-for="(pr, idx) in report.topPrs"
              :key="idx"
              :description="`PR Type: ${pr.pr_type.toUpperCase()}`"
            >
              🏆 {{ pr.exercise_name }}: {{ pr.value }} kg
            </ui5-list-item-standard>
          </ui5-list>
          <p v-else class="empty-text">No PRs set during this month.</p>
        </div>
      </ui5-card>

      <!-- Workout Consistency Streak -->
      <ui5-card class="section-card" v-if="consistencyData">
        <ui5-card-header slot="header" title-text="Training Consistency & Streaks" />
        <div class="card-content streak-box">
          <div class="streak-stat">
            <span class="fire-icon">🔥</span>
            <div>
              <div class="streak-val">{{ consistencyData.currentStreak || 0 }} Weeks</div>
              <div class="streak-lbl">Current Training Streak</div>
            </div>
          </div>
        </div>
      </ui5-card>
    </div>
  </div>
</template>

<style scoped>
.analytics-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.subtitle {
  color: var(--sapContent_LabelColor, #666);
  font-size: 0.9rem;
  margin-top: 0.2rem;
}

.filter-controls {
  display: flex;
  gap: 0.5rem;
}

.analytics-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.metrics-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.stat-card {
  width: 100%;
}

.stat-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--sapContent_LabelColor, #666);
}

.stat-value {
  font-size: 1.6rem;
  font-weight: bold;
  color: var(--sapBrandColor, #0a6ed1);
}

.section-card {
  width: 100%;
}

.card-content {
  padding: 1rem;
}

.distribution-list,
.target-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dist-item,
.target-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dist-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.progress-track {
  height: 8px;
  background-color: var(--sapList_Background, #e0e0e0);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--sapBrandColor, #0a6ed1);
}

.target-fill {
  background-color: #10b981;
}

.streak-box {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.streak-stat {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.fire-icon {
  font-size: 2.5rem;
}

.streak-val {
  font-size: 1.4rem;
  font-weight: bold;
}

.streak-lbl {
  font-size: 0.85rem;
  color: var(--sapContent_LabelColor, #666);
}

.empty-text,
.loading-state {
  padding: 2rem;
  text-align: center;
  color: var(--sapContent_LabelColor, #666);
}
</style>
