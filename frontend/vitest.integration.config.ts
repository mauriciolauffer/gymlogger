import { defineConfig } from "vite";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.integration.spec.ts"],
    testTimeout: 15000,
  },
});
