import { Hono } from "hono";
import type { Env } from "../index";
import { createAuth } from "../lib/auth";

const publicRoutes = new Hono<Env>();

publicRoutes.get("/health", (c) => {
  return c.json({ status: "ok" });
});

publicRoutes.on(["GET", "POST"], "/api/auth/*", (c) => {
  return createAuth(c.env.DB, c.env.JWT_SECRET, c.env.APP_BASE_URL).handler(c.req.raw);
});

export { publicRoutes };
