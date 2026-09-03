import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";

export const createAuth = (db: D1Database, secret?: string, baseURL?: string) => {
  const drizzleDb = drizzle(db, { schema });

  if (!secret) {
    console.warn(
      "JWT_SECRET env var is not set — using insecure default. Set it in wrangler.toml or .dev.vars.",
    );
  }

  return betterAuth({
    database: drizzleAdapter(drizzleDb, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    secret: secret ?? "gymlogger-secret-key-change-in-prod",
    baseURL: baseURL ?? "http://localhost:3000",
  });
};
