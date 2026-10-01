import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import * as compiler from "vue/compiler-sfc"; // 1. Import the compiler directly
import { cloudflare } from "@cloudflare/vite-plugin";

const isTest = process.env.NODE_ENV === "test" || !!process.env.VITEST;

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5173,
  },
  plugins: [
    ...(isTest ? [] : [cloudflare()]),
    vue({
      compiler: compiler,
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("ui5-"),
        },
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          /* if (id.includes("node_modules/@ui5/webcomponents-fiori")) {
            return "ui5-fiori";
          }
          if (id.includes("node_modules/@ui5/webcomponents-icons")) {
            return "ui5-icons";
          }
          if (id.includes("node_modules/@ui5/webcomponents")) {
            return "ui5";
          } */
          if (id.includes("node_modules/vue-router")) {
            return "vue-router";
          }
          if (id.includes("node_modules/vue")) {
            return "vue";
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.integration.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "vite.config.ts",
        "src/main.ts",
        "src/vite-env.d.ts",
      ],
    },
  },
});
