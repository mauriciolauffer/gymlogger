<script setup lang="ts">
import "@ui5/webcomponents/dist/Dialog.js";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Title.js";

defineProps<{
  open: boolean;
  prTypes: string[];
}>();

const emit = defineEmits(["close"]);
</script>

<template>
  <ui5-dialog :open="open" header-text="🏆 Personal Record!" @close="emit('close')">
    <div class="pr-content">
      <div class="trophy-icon">🏆</div>
      <ui5-title level="H3">New PR Achieved!</ui5-title>
      <p class="description">
        You set a new record for:
        <strong class="pr-tags">{{ prTypes.join(", ").toUpperCase() }}</strong>
      </p>
    </div>
    <div slot="footer" class="dialog-footer">
      <ui5-button design="Emphasized" @click="emit('close')">Awesome!</ui5-button>
    </div>
  </ui5-dialog>
</template>

<style scoped>
.pr-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.5rem 1rem;
  gap: 0.75rem;
}

.trophy-icon {
  font-size: 3rem;
}

.pr-tags {
  color: var(--sapBrandColor, #0a6ed1);
}

.dialog-footer {
  display: flex;
  justify-content: center;
  padding: 0.5rem 1rem;
}
</style>
