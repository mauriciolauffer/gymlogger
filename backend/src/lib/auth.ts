import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";

export const createAuth = (db: D1Database, secret?: string, baseURL?: string) => {
  const drizzleDb = drizzle(db, { schema });

  return betterAuth({
    database: drizzleAdapter(drizzleDb, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
    },
    secret: secret || "gymlogger-secret-key-change-in-prod",
    baseURL: baseURL || "http://localhost:3000",
  });
};
