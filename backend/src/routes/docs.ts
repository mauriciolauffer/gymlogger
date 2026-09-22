import { Hono } from "hono";
import { Scalar } from "@scalar/hono-api-reference";
import openApiSpec from "../../openapi/openapi.json";

export const docsRouter = new Hono()
  .get("/", Scalar({ url: "/api/docs/openapi.json", theme: "kepler" }))
  .get("/openapi.json", (c) => c.json(openApiSpec));
