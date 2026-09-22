import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import type { Env } from "../index.js";
import { getDb } from "../db/schema.js";
import { user, usersProfile, userSettings } from "../db/schema.js";
import { updateProfileSchema, updateSettingsSchema } from "../validation/schemas.js";

export const usersRouter = new Hono<Env>()
  .get("/profile", async (c) => {
    const sessionUser = c.get("user")!;
    const db = getDb(c);

    const profile = await db
      .select({
        id: usersProfile.id,
        location: usersProfile.location,
        birthday: usersProfile.birthday,
        sex: usersProfile.sex,
        height: usersProfile.height,
        heightUnit: usersProfile.heightUnit,
        bio: usersProfile.bio,
        createdAt: usersProfile.createdAt,
        email: user.email,
        name: user.name,
      })
      .from(usersProfile)
      .innerJoin(user, eq(user.id, usersProfile.id))
      .where(eq(usersProfile.id, sessionUser.userId))
      .get();

    if (!profile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    return c.json({ profile });
  })
  .put("/profile", zValidator("json", updateProfileSchema), async (c) => {
    const sessionUser = c.get("user")!;
    const body = c.req.valid("json");

    const { name, location, birthday, sex, height, height_unit, bio } = body;

    const db = getDb(c);
    const current = await db
      .select({
        location: usersProfile.location,
        birthday: usersProfile.birthday,
        sex: usersProfile.sex,
        height: usersProfile.height,
        heightUnit: usersProfile.heightUnit,
        bio: usersProfile.bio,
      })
      .from(usersProfile)
      .where(eq(usersProfile.id, sessionUser.userId))
      .get();

    if (!current) {
      return c.json({ error: "User not found" }, 404);
    }

    await db
      .update(usersProfile)
      .set({
        location: location !== undefined ? location : current.location,
        birthday: birthday !== undefined ? birthday : current.birthday,
        sex: sex !== undefined ? sex : current.sex,
        height: height !== undefined ? height : current.height,
        heightUnit: height_unit !== undefined ? height_unit : current.heightUnit,
        bio: bio !== undefined ? bio : current.bio,
      })
      .where(eq(usersProfile.id, sessionUser.userId))
      .run();

    if (name !== undefined) {
      await db.update(user).set({ name }).where(eq(user.id, sessionUser.userId)).run();
    }

    const profile = await db
      .select({
        id: usersProfile.id,
        location: usersProfile.location,
        birthday: usersProfile.birthday,
        sex: usersProfile.sex,
        height: usersProfile.height,
        heightUnit: usersProfile.heightUnit,
        bio: usersProfile.bio,
        createdAt: usersProfile.createdAt,
        email: user.email,
        name: user.name,
      })
      .from(usersProfile)
      .innerJoin(user, eq(user.id, usersProfile.id))
      .where(eq(usersProfile.id, sessionUser.userId))
      .get();

    return c.json({ message: "Profile updated successfully", profile });
  })
  .get("/settings", async (c) => {
    const sessionUser = c.get("user")!;
    const db = getDb(c);

    let settings = await db
      .select({
        theme: userSettings.theme,
        preferredWeightUnit: userSettings.preferredWeightUnit,
        preferredLengthUnit: userSettings.preferredLengthUnit,
        language: userSettings.language,
        restTimerDurationSeconds: userSettings.restTimerDurationSeconds,
        notificationsEnabled: userSettings.notificationsEnabled,
        updatedAt: userSettings.updatedAt,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, sessionUser.userId))
      .get();

    if (!settings) {
      await db
        .insert(userSettings)
        .values({
          userId: sessionUser.userId,
          theme: "S",
          preferredWeightUnit: "kg",
          preferredLengthUnit: "cm",
          language: "en",
          restTimerDurationSeconds: 90,
          notificationsEnabled: true,
        })
        .onConflictDoNothing()
        .run();

      settings = await db
        .select({
          theme: userSettings.theme,
          preferredWeightUnit: userSettings.preferredWeightUnit,
          preferredLengthUnit: userSettings.preferredLengthUnit,
          language: userSettings.language,
          restTimerDurationSeconds: userSettings.restTimerDurationSeconds,
          notificationsEnabled: userSettings.notificationsEnabled,
          updatedAt: userSettings.updatedAt,
        })
        .from(userSettings)
        .where(eq(userSettings.userId, sessionUser.userId))
        .get();
    }

    return c.json({
      settings: settings
        ? {
            theme: settings.theme,
            preferred_weight_unit: settings.preferredWeightUnit,
            preferred_length_unit: settings.preferredLengthUnit,
            language: settings.language,
            rest_timer_duration_seconds: settings.restTimerDurationSeconds,
            notifications_enabled: settings.notificationsEnabled,
            updated_at: settings.updatedAt,
          }
        : null,
    });
  })
  .put("/settings", zValidator("json", updateSettingsSchema), async (c) => {
    const sessionUser = c.get("user")!;
    const body = c.req.valid("json");

    const {
      theme,
      preferred_weight_unit,
      preferred_length_unit,
      language,
      rest_timer_duration_seconds,
      notifications_enabled,
    } = body;

    const db = getDb(c);

    const current = await db
      .select({
        theme: userSettings.theme,
        preferredWeightUnit: userSettings.preferredWeightUnit,
        preferredLengthUnit: userSettings.preferredLengthUnit,
        language: userSettings.language,
        restTimerDurationSeconds: userSettings.restTimerDurationSeconds,
        notificationsEnabled: userSettings.notificationsEnabled,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, sessionUser.userId))
      .get();

    const newTheme = theme !== undefined ? theme : (current?.theme ?? "S");
    const newWeightUnit =
      preferred_weight_unit !== undefined
        ? preferred_weight_unit
        : (current?.preferredWeightUnit ?? "kg");
    const newLengthUnit =
      preferred_length_unit !== undefined
        ? preferred_length_unit
        : (current?.preferredLengthUnit ?? "cm");
    const newLang = language !== undefined ? language : (current?.language ?? "en");
    const newRestTimer =
      rest_timer_duration_seconds !== undefined
        ? rest_timer_duration_seconds
        : (current?.restTimerDurationSeconds ?? 90);
    const newNotifs =
      notifications_enabled !== undefined
        ? notifications_enabled
        : (current?.notificationsEnabled ?? true);

    await db
      .insert(userSettings)
      .values({
        userId: sessionUser.userId,
        theme: newTheme,
        preferredWeightUnit: newWeightUnit,
        preferredLengthUnit: newLengthUnit,
        language: newLang,
        restTimerDurationSeconds: newRestTimer,
        notificationsEnabled: newNotifs,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          theme: newTheme,
          preferredWeightUnit: newWeightUnit,
          preferredLengthUnit: newLengthUnit,
          language: newLang,
          restTimerDurationSeconds: newRestTimer,
          notificationsEnabled: newNotifs,
          updatedAt: new Date(),
        },
      })
      .run();

    const settings = await db
      .select({
        theme: userSettings.theme,
        preferredWeightUnit: userSettings.preferredWeightUnit,
        preferredLengthUnit: userSettings.preferredLengthUnit,
        language: userSettings.language,
        restTimerDurationSeconds: userSettings.restTimerDurationSeconds,
        notificationsEnabled: userSettings.notificationsEnabled,
        updatedAt: userSettings.updatedAt,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, sessionUser.userId))
      .get();

    return c.json({
      message: "Settings updated successfully",
      settings: settings
        ? {
            theme: settings.theme,
            preferred_weight_unit: settings.preferredWeightUnit,
            preferred_length_unit: settings.preferredLengthUnit,
            language: settings.language,
            rest_timer_duration_seconds: settings.restTimerDurationSeconds,
            notifications_enabled: settings.notificationsEnabled,
            updated_at: settings.updatedAt,
          }
        : null,
    });
  });
