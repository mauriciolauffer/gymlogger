import { Hono } from "hono";
import type { Env } from "../index";
import { createAuth } from "../lib/auth";
import { generateToken, hashPassword, verifyPassword } from "../utils/crypto";
import { authMiddleware } from "../middleware/auth";

export const authRouter = new Hono<Env>();

authRouter.post("/register", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { name, email, password } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return c.json({ error: "Valid email is required" }, 400);
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return c.json({ error: "Password must be at least 6 characters long" }, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await c.env.DB.prepare("SELECT id FROM user WHERE email = ?")
    .bind(normalizedEmail)
    .first();

  if (existingUser) {
    return c.json({ error: "Email is already registered" }, 400);
  }

  let userId: string;
  let token: string;

  try {
    const authInstance = createAuth(c.env.DB);
    const baResult = await authInstance.api.signUpEmail({
      body: {
        email: normalizedEmail,
        password,
        name: name || "Athlete",
      },
    });

    userId = baResult.user.id;
    token = baResult.token || (await generateToken({ userId, email: normalizedEmail }));
  } catch {
    userId = crypto.randomUUID();
    token = await generateToken({ userId, email: normalizedEmail });
  }

  const passwordHash = await hashPassword(password);

  // Sync with domain users table
  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)`,
  )
    .bind(userId, normalizedEmail, passwordHash, name ?? null)
    .run();

  // Ensure default user settings exist
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO user_settings (user_id, theme, preferred_weight_unit, preferred_length_unit, language, rest_timer_duration_seconds)
     VALUES (?, 'system', 'kg', 'cm', 'en', 90)`,
  )
    .bind(userId)
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
});

authRouter.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await c.env.DB.prepare(
    "SELECT id, email, password_hash, name FROM users WHERE email = ?",
  )
    .bind(normalizedEmail)
    .first<{ id: string; email: string; password_hash: string; name: string | null }>();

  if (!user) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  let token: string | null = null;

  try {
    const authInstance = createAuth(c.env.DB);
    const baResult = await authInstance.api.signInEmail({
      body: {
        email: normalizedEmail,
        password,
      },
    });
    token = baResult.token || null;
  } catch {
    // verify with hash fallback
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
  }

  if (!token) {
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    token = await generateToken({ userId: user.id, email: user.email });
  }

  return c.json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
});

authRouter.post("/logout", authMiddleware, async (c) => {
  try {
    const authInstance = createAuth(c.env.DB);
    await authInstance.api.signOut({
      headers: c.req.raw.headers,
    });
  } catch {
    // proceed
  }
  return c.json({ message: "Logout successful" });
});
