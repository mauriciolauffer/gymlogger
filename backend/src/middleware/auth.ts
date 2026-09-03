import type { MiddlewareHandler } from "hono";
import type { Env } from "../index";
import { createAuth } from "../lib/auth";
import { verifyToken } from "../utils/crypto";
import { eq, and, gt } from "drizzle-orm";
import { getDb, session as sessionTable, user as userTable } from "../db/schema";

export const authMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  try {
    const authInstance = createAuth(c.env.DB, c.env.JWT_SECRET, c.env.APP_BASE_URL);
    const session = await authInstance.api.getSession({
      headers: c.req.raw.headers,
    });

    if (session) {
      c.set("user", { userId: session.user.id, email: session.user.email });
      return await next();
    }
  } catch {
    // Fall back to token check
  }

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);

    const payload = await verifyToken(
      token,
      c.env.JWT_SECRET ?? "gymlogger-secret-key-change-in-prod",
    );
    if (payload) {
      c.set("user", payload);
      return await next();
    }

    const db = getDb(c);
    const now = new Date();

    const sessionRecord = await db
      .select({ userId: sessionTable.userId, email: userTable.email })
      .from(sessionTable)
      .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
      .where(and(eq(sessionTable.token, token), gt(sessionTable.expiresAt, now)))
      .get();

    if (sessionRecord) {
      c.set("user", { userId: sessionRecord.userId, email: sessionRecord.email });
      return await next();
    }
  }

  return c.json({ error: "Unauthorized: Missing or invalid session" }, 401);
};
