<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/ListItemStandard.js";
import "@ui5/webcomponents/dist/Panel.js";
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/Option.js";

import { api } from "../api/client";
import { formatDurationHours } from "../utils/formatters";

interface MonthlyReport {
  totalWorkouts: number;
  totalVolume: number;
  totalDurationSeconds: number;
  topPRs: Array<{ exerciseName: string; prType: string; value: number; valueUnit?: string }>;
  muscleDistribution: Array<{
    muscleGroupId: string;
    muscleGroup: string;
    setCount: number;
    percentage: number;
  }>;
}

interface SetsPerMuscleGroup {
  muscleGroupId: string;
  muscleGroup: string;
  setCount: number;
  hypertrophyTargetMin: number;
  hypertrophyTargetMax: number;
}

interface ConsistencyData {
  currentStreakDays: number;
  totalWorkouts: number;
  activeDates: string[];
}

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const selectedYear = ref(currentYear);
const selectedMonth = ref(currentMonth);

const loading = ref(false);
const report = ref<MonthlyReport | null>(null);
const setsPerMuscleGroup = ref<SetsPerMuscleGroup[]>([]);
const consistencyData = ref<ConsistencyData | null>(null);

const availableYears = computed(() => {
  return [currentYear, currentYear - 1];
});

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
    const startDate = `${selectedYear.value}-${String(selectedMonth.value).padStart(2, "0")}-01`;
    const nextM = selectedMonth.value === 12 ? 1 : selectedMonth.value + 1;
    const nextY = selectedMonth.value === 12 ? selectedYear.value + 1 : selectedYear.value;
    const endDate = `${nextY}-${String(nextM).padStart(2, "0")}-01`;

    const [reportData, spmgRes, consistencyRes] = await Promise.all([
      api.get<MonthlyReport>(
        `/api/v1/analytics/monthly-report?year=${selectedYear.value}&month=${selectedMonth.value}`,
      ),
      api.get<{ setsPerMuscleGroup: SetsPerMuscleGroup[] }>(
        `/api/v1/analytics/sets-per-muscle-group?from=${startDate}&to=${endDate}`,
      ),
      api.get<ConsistencyData>("/api/v1/analytics/consistency"),
    ]);

    report.value = reportData;
    setsPerMuscleGroup.value = spmgRes.setsPerMuscleGroup || [];
    consistencyData.value = consistencyRes;
  } catch (err) {
    console.error("Failed to load analytics report", err);
  } finally {
    loading.value = false;
  }
};

const handleMonthChange = (e: Event) => {
  const select = e.target as HTMLElement & { selectedOption: { value: string } };
  selectedMonth.value = Number(select.selectedOption.value);
  fetchAnalytics();
};

const handleYearChange = (e: Event) => {
  const select = e.target as HTMLElement & { selectedOption: { value: string } };
  selectedYear.value = Number(select.selectedOption.value);
  fetchAnalytics();
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
        <p class="subtitle">Periodic training progress summary</p>
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
          <ui5-option
            v-for="year in availableYears"
            :key="year"
            :value="String(year)"
            :selected="selectedYear === year"
          >
            {{ year }}
          </ui5-option>
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
              :key="item.muscleGroup"
              class="dist-item"
            >
              <div class="dist-meta">
                <span>{{ item.muscleGroup }}</span>
                <span>{{ item.setCount }} sets ({{ item.percentage }}%)</span>
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
          <div v-if="setsPerMuscleGroup?.length" class="target-list">
            <div v-for="item in setsPerMuscleGroup" :key="item.muscleGroup" class="target-item">
              <div class="dist-meta">
                <span>{{ item.muscleGroup }}</span>
                <span>
                  {{ item.setCount }} / {{ item.hypertrophyTargetMin }}-{{
                    item.hypertrophyTargetMax
                  }}
                  weekly sets
                </span>
              </div>
              <div class="progress-track">
                <div
                  class="progress-fill target-fill"
                  :style="{
                    width: Math.min(100, (item.setCount / item.hypertrophyTargetMax) * 100) + '%',
                  }"
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
          <ui5-list v-if="report.topPRs?.length">
            <ui5-list-item-standard
              v-for="(pr, idx) in report.topPRs"
              :key="idx"
              :description="`PR Type: ${pr.prType.toUpperCase()}`"
            >
              🏆 {{ pr.exerciseName }}: {{ pr.value }} {{ pr.valueUnit || "kg" }}
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
              <div class="streak-val">{{ consistencyData.currentStreakDays || 0 }} Days</div>
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
