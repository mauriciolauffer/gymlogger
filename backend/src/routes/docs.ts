import { Hono } from "hono";
import { Scalar } from "@scalar/hono-api-reference";
import openApiSpec from "../../openapi/openapi.json";
export const docsRouter = new Hono()
  .use("*", (c, next) => {
    if (process.env.NODE_ENV !== "development") {
      return c.json({ error: "Endpoint not found" }, 404);
    }
    return next();
  })
  .get("/", Scalar({ url: "/api/docs/openapi.json", theme: "kepler" }))
  .get("/openapi.json", (c) => c.json(openApiSpec));
