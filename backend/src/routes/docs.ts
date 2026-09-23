import { Hono } from "hono";
import { Scalar } from "@scalar/hono-api-reference";

let openApiSpec: object;

export const docsRouter = new Hono()
  .use("*", async (c, next) => {
    if (process.env.NODE_ENV !== "development") {
      return c.json({ error: "Endpoint not found" }, 404);
    }
    if (openApiSpec) {
      openApiSpec = await import("../../openapi/openapi.json");
    }
    return next();
  })
  .get("/", Scalar({ url: "/api/docs/openapi.json", theme: "kepler" }))
  .get("/openapi.json", (c) => c.json(openApiSpec));
