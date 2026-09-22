import { Hono } from "hono";
import type { Env } from "../index";
import { createAuth } from "../lib/auth";

export const publicRoutes = new Hono<Env>()
  .get("/health", (c) => {
    return c.json({ status: "ok" });
  })
  .on(["GET", "POST"], "/api/auth/*", (c) => {
    return createAuth(c.env.DB, c.env.JWT_SECRET, c.env.APP_BASE_URL, c.env.CORS_ORIGIN).handler(
      c.req.raw,
    );
  });
