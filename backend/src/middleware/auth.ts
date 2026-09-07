import type { MiddlewareHandler } from "hono";
import type { Env } from "../index";
import { verifyJWT } from "better-auth/crypto";
import { eq, and, gt } from "drizzle-orm";
import { getDb, session as sessionTable, user as userTable } from "../db/schema";

export const authMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    // @ts-expect-error: Argument of type 'string | undefined' is not assignable to parameter of type 'string'
    const payload = await verifyJWT<{ userId: string; email: string }>(token, c.env.JWT_SECRET);
    if (payload) {
      c.set("user", { userId: payload.userId, email: payload.email });
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
