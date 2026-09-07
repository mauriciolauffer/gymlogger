import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../index";
import { hashPassword, verifyPassword, signJWT } from "better-auth/crypto";
import { authMiddleware } from "../middleware/auth";
import { getDb } from "../db/schema";
import { user, usersProfile, userSettings, account } from "../db/schema";

export const authRouter = new Hono<Env>()
  .post("/register", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const { name, email, password } = body;

    if (
      !email ||
      typeof email !== "string" ||
      !email.includes("@") ||
      email.indexOf("@") === 0 ||
      email.lastIndexOf(".") < email.indexOf("@")
    ) {
      return c.json({ error: "Valid email is required" }, 400);
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters long" }, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb(c);

    const existingUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .get();

    if (existingUser) {
      return c.json({ error: "Email is already registered" }, 400);
    }

    const secret = c.env.JWT_SECRET ?? "gymlogger-secret-key-change-in-prod";
    const userId = crypto.randomUUID();
    const now = new Date();
    const displayName = name || "Athlete";
    const hashedPassword = await hashPassword(password);

    await db
      .insert(user)
      .values({
        id: userId,
        email: normalizedEmail,
        name: displayName,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    await db
      .insert(account)
      .values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    await db.insert(usersProfile).values({ id: userId }).onConflictDoNothing().run();

    await db
      .insert(userSettings)
      .values({
        userId,
        theme: "system",
        preferredWeightUnit: "kg",
        preferredLengthUnit: "cm",
        language: "en",
        restTimerDurationSeconds: 90,
      })
      .onConflictDoNothing()
      .run();

    const token = await signJWT({ userId, email: normalizedEmail }, secret, 2592000);

    return c.json(
      {
        message: "Account created successfully",
        token,
        user: {
          id: userId,
          email: normalizedEmail,
          name: name ?? null,
        },
      },
      201,
    );
  })
  .post("/login", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb(c);

    const userRow = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
      })
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .get();

    if (!userRow) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const secret = c.env.JWT_SECRET ?? "gymlogger-secret-key-change-in-prod";

    const accountRow = await db
      .select({ password: account.password })
      .from(account)
      .where(eq(account.userId, userRow.id))
      .get();

    if (!accountRow?.password) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const valid = await verifyPassword({ hash: accountRow.password, password });
    if (!valid) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const token = await signJWT({ userId: userRow.id, email: userRow.email }, secret, 2592000);

    return c.json({
      message: "Login successful",
      token,
      user: {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
      },
    });
  })
  .post("/logout", authMiddleware, async (c) => {
    return c.json({ message: "Logout successful" });
  });
