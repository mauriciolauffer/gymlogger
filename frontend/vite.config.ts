import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import * as compiler from "vue/compiler-sfc"; // 1. Import the compiler directly
import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    cloudflare(),
    vue({
      compiler: compiler,
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
  test: {
    globals: true,
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.integration.spec.ts"],
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
