<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Title.js";
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/ListItemStandard.js";

import { api } from "../api/client";
import { activeWorkoutStore } from "../store/activeWorkout";
import TemplateEditorModal from "../components/TemplateEditorModal.vue";

const router = useRouter();

const templates = ref<any[]>([]);
const loading = ref(false);
const editingTemplate = ref<any | null>(null);
const showEditorModal = ref(false);

const fetchTemplates = async () => {
  loading.value = true;
  try {
    const res = await api.get<{ templates: any[] }>("/api/v1/workout-templates");
    templates.value = res.templates || [];
  } catch (err) {
    console.error("Failed to fetch templates", err);
  } finally {
    loading.value = false;
  }
};

const handleCreateNew = () => {
  editingTemplate.value = null;
  showEditorModal.value = true;
};

const handleEdit = async (tplId: string) => {
  try {
    const res = await api.get<{ template: any }>(`/api/v1/workout-templates/${tplId}`);
    editingTemplate.value = res.template;
    showEditorModal.value = true;
  } catch (err) {
    console.error("Failed to load template details", err);
  }
};

const handleDelete = async (tplId: string) => {
  if (!confirm("Are you sure you want to delete this template?")) return;
  try {
    await api.delete(`/api/v1/workout-templates/${tplId}`);
    fetchTemplates();
  } catch (err) {
    console.error("Failed to delete template", err);
  }
};

const handleStartFromTemplate = async (tpl: any) => {
  try {
    await activeWorkoutStore.startWorkout(tpl.title, tpl.id);
    router.push("/active-workout");
  } catch (err) {
    console.error("Failed to start workout from template", err);
  }
};

onMounted(() => {
  fetchTemplates();
});
</script>

<template>
  <div class="templates-container">
    <div class="header-actions">
      <div>
        <ui5-title level="H2">Workout Templates</ui5-title>
        <p class="subtitle">Save routine setups for instant workout logging (REQ-08)</p>
      </div>
      <ui5-button design="Emphasized" @click="handleCreateNew">
        + Create Template
      </ui5-button>
    </div>

    <div v-if="loading" class="loading-state">Loading templates...</div>

    <div v-else-if="templates.length" class="templates-grid">
      <ui5-card v-for="tpl in templates" :key="tpl.id" class="template-card">
        <ui5-card-header
          slot="header"
          :title-text="tpl.title"
          :subtitle-text="`${tpl.exercise_count || 0} Exercises`"
        />
        <div class="card-content">
          <p class="notes" v-if="tpl.notes">{{ tpl.notes }}</p>
          <div class="card-actions">
            <ui5-button design="Emphasized" @click="handleStartFromTemplate(tpl)">Start Workout</ui5-button>
            <ui5-button design="Transparent" @click="handleEdit(tpl.id)">Edit</ui5-button>
            <ui5-button design="Negative" @click="handleDelete(tpl.id)">Delete</ui5-button>
          </div>
        </div>
      </ui5-card>
    </div>

    <div v-else class="empty-state">
      <p>No workout templates found. Create a template to speed up workout tracking!</p>
    </div>

    <TemplateEditorModal
      :open="showEditorModal"
      :template="editingTemplate"
      @close="showEditorModal = false"
      @saved="fetchTemplates"
    />
  </div>
</template>

<style scoped>
.templates-container {
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

.subtitle {
  color: var(--sapContent_LabelColor, #666);
  font-size: 0.9rem;
  margin-top: 0.2rem;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.template-card {
  width: 100%;
}

.card-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.notes {
  color: var(--sapContent_LabelColor, #666);
  font-size: 0.85rem;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.loading-state,
.empty-state {
  padding: 3rem;
  text-align: center;
  color: var(--sapContent_LabelColor, #666);
}
</style>
