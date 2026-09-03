import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware } from "../middleware/auth";
import { getDb } from "../db/schema";
import { usersProfile, userSettings } from "../db/schema";

const VALID_WEIGHT_UNITS = new Set(["kg", "lbs"]);
const VALID_LENGTH_UNITS = new Set(["cm", "in"]);

export const usersRouter = new Hono<Env>()
  .use("*", authMiddleware)
  .get("/profile", async (c) => {
    const user = c.get("user")!;
    const db = getDb(c);

    const profile = await db
      .select({
        id: usersProfile.id,
        email: usersProfile.email,
        name: usersProfile.name,
        location: usersProfile.location,
        birthday: usersProfile.birthday,
        sex: usersProfile.sex,
        height: usersProfile.height,
        heightUnit: usersProfile.heightUnit,
        bio: usersProfile.bio,
        createdAt: usersProfile.createdAt,
      })
      .from(usersProfile)
      .where(eq(usersProfile.id, user.userId))
      .get();

    if (!profile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    return c.json({ profile });
  })
  .put("/profile", async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => null);

    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const { name, location, birthday, sex, height, height_unit, bio } = body;

    if (sex !== undefined && sex !== null) {
      const validSexes = ["male", "female", "other", "prefer_not_to_say"];
      if (!validSexes.includes(sex)) {
        return c.json({ error: "Invalid sex value" }, 400);
      }
    }

    if (height !== undefined && height !== null) {
      if (typeof height !== "number" || height <= 0) {
        return c.json({ error: "Height must be a positive number" }, 400);
      }
    }

    if (height_unit !== undefined && height_unit !== null) {
      if (!VALID_LENGTH_UNITS.has(height_unit)) {
        return c.json({ error: "Invalid height unit" }, 400);
      }
    }

    const db = getDb(c);

    const current = await db
      .select({
        name: usersProfile.name,
        location: usersProfile.location,
        birthday: usersProfile.birthday,
        sex: usersProfile.sex,
        height: usersProfile.height,
        heightUnit: usersProfile.heightUnit,
        bio: usersProfile.bio,
      })
      .from(usersProfile)
      .where(eq(usersProfile.id, user.userId))
      .get();

    if (!current) {
      return c.json({ error: "User not found" }, 404);
    }

    await db
      .update(usersProfile)
      .set({
        name: name !== undefined ? name : current.name,
        location: location !== undefined ? location : current.location,
        birthday: birthday !== undefined ? birthday : current.birthday,
        sex: sex !== undefined ? sex : current.sex,
        height: height !== undefined ? height : current.height,
        heightUnit: height_unit !== undefined ? height_unit : current.heightUnit,
        bio: bio !== undefined ? bio : current.bio,
      })
      .where(eq(usersProfile.id, user.userId))
      .run();

    const profile = await db
      .select({
        id: usersProfile.id,
        email: usersProfile.email,
        name: usersProfile.name,
        location: usersProfile.location,
        birthday: usersProfile.birthday,
        sex: usersProfile.sex,
        height: usersProfile.height,
        heightUnit: usersProfile.heightUnit,
        bio: usersProfile.bio,
        createdAt: usersProfile.createdAt,
      })
      .from(usersProfile)
      .where(eq(usersProfile.id, user.userId))
      .get();

    return c.json({ message: "Profile updated successfully", profile });
  })
  .get("/settings", async (c) => {
    const user = c.get("user")!;
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
      .where(eq(userSettings.userId, user.userId))
      .get();

    if (!settings) {
      await db
        .insert(userSettings)
        .values({
          userId: user.userId,
          theme: "system",
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
        .where(eq(userSettings.userId, user.userId))
        .get();
    }

    return c.json({ settings });
  })
  .put("/settings", async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => null);

    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const {
      theme,
      preferred_weight_unit,
      preferred_length_unit,
      language,
      rest_timer_duration_seconds,
      notifications_enabled,
    } = body;

    if (theme !== undefined && theme !== null) {
      if (!["light", "dark", "system"].includes(theme)) {
        return c.json({ error: "Invalid theme" }, 400);
      }
    }

    if (preferred_weight_unit !== undefined && preferred_weight_unit !== null) {
      if (!VALID_WEIGHT_UNITS.has(preferred_weight_unit)) {
        return c.json({ error: "Invalid weight unit" }, 400);
      }
    }

    if (preferred_length_unit !== undefined && preferred_length_unit !== null) {
      if (!VALID_LENGTH_UNITS.has(preferred_length_unit)) {
        return c.json({ error: "Invalid length unit" }, 400);
      }
    }

    if (rest_timer_duration_seconds !== undefined && rest_timer_duration_seconds !== null) {
      if (typeof rest_timer_duration_seconds !== "number" || rest_timer_duration_seconds <= 0) {
        return c.json({ error: "Rest timer duration must be a positive integer" }, 400);
      }
    }

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
      .where(eq(userSettings.userId, user.userId))
      .get();

    const newTheme = theme !== undefined ? theme : (current?.theme ?? "system");
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
        userId: user.userId,
        theme: newTheme,
        preferredWeightUnit: newWeightUnit,
        preferredLengthUnit: newLengthUnit,
        language: newLang,
        restTimerDurationSeconds: newRestTimer,
        notificationsEnabled: newNotifs,
        updatedAt: new Date().toISOString(),
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
          updatedAt: new Date().toISOString(),
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
      .where(eq(userSettings.userId, user.userId))
      .get();

    return c.json({ message: "Settings updated successfully", settings });
  });
