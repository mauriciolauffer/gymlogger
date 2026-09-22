import { Hono } from "hono";
import type { Env } from "../index.ts";
import { createAuth } from "../lib/auth.js";
import { docsRouter } from "./docs.js";

export const publicRoutes = new Hono<Env>()
  .get("/favicon.ico", (c) => c.body(null, 204))
  .get("/api/health", (c) => {
    return c.json({ status: "ok" });
  })
  .on(["GET", "POST"], "/api/auth/*", (c) => {
    return createAuth(c.env.DB, c.env.JWT_SECRET, c.env.APP_BASE_URL, c.env.CORS_ORIGIN).handler(
      c.req.raw,
    );
  })
  .route("/api/docs", docsRouter);
