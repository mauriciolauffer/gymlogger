<script setup lang="ts">
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Title.js";
</script>

<template>
  <main class="container">
    <ui5-title level="H1">GymLogger</ui5-title>
    <p>Edge-native workout tracker</p>
    <ui5-button design="Emphasized">Start Workout</ui5-button>
  </main>
</template>

<style scoped>
.container {
  padding: 2rem;
  font-family: var(--sapFontFamily, sans-serif);
}
</style>
