import type { MiddlewareHandler } from "hono";
import type { Env } from "../index";
import { verifyToken } from "../utils/crypto";

export const authMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Missing or invalid token" }, 401);
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token);

  if (!payload) {
    return c.json({ error: "Unauthorized: Invalid or expired token" }, 401);
  }

  c.set("user", payload);
  await next();
};
