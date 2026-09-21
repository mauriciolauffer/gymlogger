import { createMiddleware } from "hono/factory";
import type { Env } from "../index";
import { createAuth } from "../lib/auth";

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const auth = createAuth(c.env.DB, c.env.JWT_SECRET, c.env.APP_BASE_URL, c.env.CORS_ORIGIN);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ error: "Unauthorized: Missing or invalid session" }, 401);
  }

  c.set("user", { userId: session.user.id, email: session.user.email });
  return next();
});
