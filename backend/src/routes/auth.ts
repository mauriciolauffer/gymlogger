import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../index";
import { createAuth } from "../lib/auth";
import { generateToken, hashPassword, verifyPassword } from "../utils/crypto";
import { authMiddleware } from "../middleware/auth";
import { getDb } from "../db/schema";
import { user, usersProfile, userSettings } from "../db/schema";

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

    let userId: string;
    let token: string;

    const secret = c.env.JWT_SECRET ?? "gymlogger-secret-key-change-in-prod";

    try {
      const authInstance = createAuth(c.env.DB, secret, c.env.APP_BASE_URL);
      const baResult = await authInstance.api.signUpEmail({
        body: {
          email: normalizedEmail,
          password,
          name: name || "Athlete",
        },
      });

      userId = baResult.user.id;
      token = baResult.token || (await generateToken({ userId, email: normalizedEmail }, secret));
    } catch {
      userId = crypto.randomUUID();
      token = await generateToken({ userId, email: normalizedEmail }, secret);
    }

    const passwordHash = await hashPassword(password);

    await db
      .insert(usersProfile)
      .values({ id: userId, email: normalizedEmail, passwordHash, name: name ?? null })
      .onConflictDoUpdate({
        target: usersProfile.id,
        set: { email: normalizedEmail, passwordHash, name: name ?? null },
      })
      .run();

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
        id: usersProfile.id,
        email: usersProfile.email,
        passwordHash: usersProfile.passwordHash,
        name: usersProfile.name,
      })
      .from(usersProfile)
      .where(eq(usersProfile.email, normalizedEmail))
      .get();

    if (!userRow) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const secret = c.env.JWT_SECRET ?? "gymlogger-secret-key-change-in-prod";
    let token: string | null = null;

    try {
      const authInstance = createAuth(c.env.DB, secret, c.env.APP_BASE_URL);
      const baResult = await authInstance.api.signInEmail({
        body: { email: normalizedEmail, password },
      });
      token = baResult.token || null;
    } catch (err) {
      // Better Auth unavailable — fall through to custom path below
      console.error(err);
    }

    if (!token) {
      const validPassword = await verifyPassword(password, userRow.passwordHash!);
      if (!validPassword) {
        return c.json({ error: "Invalid email or password" }, 401);
      }
      token = await generateToken({ userId: userRow.id, email: userRow.email }, secret);
    }

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
    try {
      const authInstance = createAuth(c.env.DB, c.env.JWT_SECRET, c.env.APP_BASE_URL);
      await authInstance.api.signOut({
        headers: c.req.raw.headers,
      });
    } catch {
      // proceed
    }
    return c.json({ message: "Logout successful" });
  });
