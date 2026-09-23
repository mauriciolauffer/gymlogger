import { defineConfig } from "@rcmade/hono-docs";

export default defineConfig({
  tsConfigPath: "./tsconfig.json",
  openApi: {
    openapi: "3.0.0",
    info: {
      title: "GymLogger API",
      version: "1.0.0",
      description: "GymLogger backend API — generated from Hono route types.",
    },
    servers: [{ url: "http://localhost:8787", description: "Local development" }],
  },
  outputs: {
    openApiJson: "./openapi/openapi.json",
    openApiYaml: "../docs/openapi.yml",
  },
  apis: [
    {
      name: "GymLogger",
      apiPrefix: "",
      appTypePath: "src/index.ts",
    },
  ],
});
