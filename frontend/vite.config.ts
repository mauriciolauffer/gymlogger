/// <reference types="vitest" />
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      vapor: true,
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("ui5-"),
        },
      },
    }),
  ],
  optimizeDeps: {
    include: [
      "@ui5/webcomponents-fiori/dist/ShellBar.js",
      "@ui5/webcomponents/dist/TabContainer.js",
      "@ui5/webcomponents/dist/Tab.js",
      "@ui5/webcomponents/dist/Button.js",
      "@ui5/webcomponents/dist/Title.js",
      "@ui5/webcomponents/dist/Card.js",
      "@ui5/webcomponents/dist/CardHeader.js",
      "@ui5/webcomponents/dist/Input.js",
      "@ui5/webcomponents/dist/Select.js",
      "@ui5/webcomponents/dist/Option.js",
      "@ui5/webcomponents/dist/Dialog.js",
      "@ui5/webcomponents/dist/List.js",
      "@ui5/webcomponents/dist/ListItemStandard.js",
    ],
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    browser: {
      enabled: true,
      provider: "playwright",
      instances: [
        {
          browser: "chromium",
          headless: true,
          launch: process.env.CHROMIUM_PATH
            ? { executablePath: process.env.CHROMIUM_PATH }
            : undefined,
        },
      ],
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        statements: 85,
        lines: 85,
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
