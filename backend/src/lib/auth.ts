import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
// import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema.js";
// import { hashPassword, verifyPassword } from "../utils/crypto.js";

export const createAuth = (db: D1Database, secret?: string, baseURL?: string) => {
  // const drizzleDb = drizzle(db, { schema });

  if (!secret) {
    console.error(
      "JWT_SECRET env var is not set — using insecure default. Set it in wrangler.toml or .dev.vars.",
    );
  }

  return betterAuth({
    appName: "gymlogger",
    advanced: {
      database: {
        joins: true,
      },
    },
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),

    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      /* password: {
        hash: hashPassword,
        verify: verifyPassword,
      }, */
      minPasswordLength: 10,
    },

    secret: secret,
    baseURL: baseURL,
    // basePath: ""
  });
};
