import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema.js";
import { usersProfile, userSettings } from "../db/schema.js";

export const createAuth = (db: D1Database, secret: string, baseURL: string) => {
  const drizzleDb = drizzle(db, { schema });

  return betterAuth({
    appName: "gymlogger",
    database: drizzleAdapter(drizzleDb, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
    },
    plugins: [bearer()],
    secret,
    baseURL,
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await drizzleDb
              .insert(usersProfile)
              .values({ id: user.id })
              .onConflictDoNothing()
              .run();
            await drizzleDb
              .insert(userSettings)
              .values({
                userId: user.id,
                theme: "system",
                preferredWeightUnit: "kg",
                preferredLengthUnit: "cm",
                language: "en",
                restTimerDurationSeconds: 90,
                notificationsEnabled: true,
              })
              .onConflictDoNothing()
              .run();
          },
        },
      },
    },
  });
};
