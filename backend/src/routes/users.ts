import { Hono } from "hono";
import type { Env } from "../index";
import { authMiddleware } from "../middleware/auth";

export const usersRouter = new Hono<Env>()
  .use("*", authMiddleware)
  .get("/profile", async (c) => {
    const user = c.get("user")!;

    const profile = await c.env.DB.prepare(
      `SELECT id, email, name, location, birthday, sex, height, height_unit, bio, created_at FROM users WHERE id = ?`,
    )
      .bind(user.userId)
      .first();

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
      const unitInDb = await c.env.DB.prepare(
        "SELECT code FROM units WHERE code = ? AND type = 'length'",
      )
        .bind(height_unit)
        .first();
      if (!unitInDb) {
        return c.json({ error: "Invalid height unit" }, 400);
      }
    }

    const current = await c.env.DB.prepare(
      "SELECT name, location, birthday, sex, height, height_unit, bio FROM users WHERE id = ?",
    )
      .bind(user.userId)
      .first<any>();

    if (!current) {
      return c.json({ error: "User not found" }, 404);
    }

    const updatedName = name !== undefined ? name : current.name;
    const updatedLocation = location !== undefined ? location : current.location;
    const updatedBirthday = birthday !== undefined ? birthday : current.birthday;
    const updatedSex = sex !== undefined ? sex : current.sex;
    const updatedHeight = height !== undefined ? height : current.height;
    const updatedHeightUnit = height_unit !== undefined ? height_unit : current.height_unit;
    const updatedBio = bio !== undefined ? bio : current.bio;

    await c.env.DB.prepare(
      `UPDATE users
       SET name = ?, location = ?, birthday = ?, sex = ?, height = ?, height_unit = ?, bio = ?
       WHERE id = ?`,
    )
      .bind(
        updatedName,
        updatedLocation,
        updatedBirthday,
        updatedSex,
        updatedHeight,
        updatedHeightUnit,
        updatedBio,
        user.userId,
      )
      .run();

    const profile = await c.env.DB.prepare(
      `SELECT id, email, name, location, birthday, sex, height, height_unit, bio, created_at FROM users WHERE id = ?`,
    )
      .bind(user.userId)
      .first();

    return c.json({ message: "Profile updated successfully", profile });
  })
  .get("/settings", async (c) => {
    const user = c.get("user")!;

    let settings = await c.env.DB.prepare(
      `SELECT theme, preferred_weight_unit, preferred_length_unit, language, rest_timer_duration_seconds, notifications_enabled, updated_at
       FROM user_settings WHERE user_id = ?`,
    )
      .bind(user.userId)
      .first();

    if (!settings) {
      await c.env.DB.prepare(
        `INSERT INTO user_settings (user_id, theme, preferred_weight_unit, preferred_length_unit, language, rest_timer_duration_seconds, notifications_enabled)
         VALUES (?, 'system', 'kg', 'cm', 'en', 90, TRUE)`,
      )
        .bind(user.userId)
        .run();

      settings = await c.env.DB.prepare(
        `SELECT theme, preferred_weight_unit, preferred_length_unit, language, rest_timer_duration_seconds, notifications_enabled, updated_at
         FROM user_settings WHERE user_id = ?`,
      )
        .bind(user.userId)
        .first();
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
      const unit = await c.env.DB.prepare(
        "SELECT code FROM units WHERE code = ? AND type = 'weight'",
      )
        .bind(preferred_weight_unit)
        .first();
      if (!unit) {
        return c.json({ error: "Invalid weight unit" }, 400);
      }
    }

    if (preferred_length_unit !== undefined && preferred_length_unit !== null) {
      const unit = await c.env.DB.prepare(
        "SELECT code FROM units WHERE code = ? AND type = 'length'",
      )
        .bind(preferred_length_unit)
        .first();
      if (!unit) {
        return c.json({ error: "Invalid length unit" }, 400);
      }
    }

    if (rest_timer_duration_seconds !== undefined && rest_timer_duration_seconds !== null) {
      if (typeof rest_timer_duration_seconds !== "number" || rest_timer_duration_seconds <= 0) {
        return c.json({ error: "Rest timer duration must be a positive integer" }, 400);
      }
    }

    const current = await c.env.DB.prepare(
      `SELECT theme, preferred_weight_unit, preferred_length_unit, language, rest_timer_duration_seconds, notifications_enabled FROM user_settings WHERE user_id = ?`,
    )
      .bind(user.userId)
      .first<any>();

    const newTheme = theme !== undefined ? theme : (current?.theme ?? "system");
    const newWeightUnit =
      preferred_weight_unit !== undefined
        ? preferred_weight_unit
        : (current?.preferred_weight_unit ?? "kg");
    const newLengthUnit =
      preferred_length_unit !== undefined
        ? preferred_length_unit
        : (current?.preferred_length_unit ?? "cm");
    const newLang = language !== undefined ? language : (current?.language ?? "en");
    const newRestTimer =
      rest_timer_duration_seconds !== undefined
        ? rest_timer_duration_seconds
        : (current?.rest_timer_duration_seconds ?? 90);
    const newNotifs =
      notifications_enabled !== undefined
        ? notifications_enabled
        : (current?.notifications_enabled ?? true);

    await c.env.DB.prepare(
      `INSERT INTO user_settings (user_id, theme, preferred_weight_unit, preferred_length_unit, language, rest_timer_duration_seconds, notifications_enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         theme = excluded.theme,
         preferred_weight_unit = excluded.preferred_weight_unit,
         preferred_length_unit = excluded.preferred_length_unit,
         language = excluded.language,
         rest_timer_duration_seconds = excluded.rest_timer_duration_seconds,
         notifications_enabled = excluded.notifications_enabled,
         updated_at = CURRENT_TIMESTAMP`,
    )
      .bind(
        user.userId,
        newTheme,
        newWeightUnit,
        newLengthUnit,
        newLang,
        newRestTimer,
        newNotifs ? 1 : 0,
      )
      .run();

    const settings = await c.env.DB.prepare(
      `SELECT theme, preferred_weight_unit, preferred_length_unit, language, rest_timer_duration_seconds, notifications_enabled, updated_at
       FROM user_settings WHERE user_id = ?`,
    )
      .bind(user.userId)
      .first();

    return c.json({ message: "Settings updated successfully", settings });
  });
