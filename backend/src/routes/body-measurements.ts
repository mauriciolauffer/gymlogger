import { Hono } from "hono";
import type { Env } from "../index";
import { authMiddleware } from "../middleware/auth";
import { convertLength, convertWeight } from "../utils/unit-converter";

export const bodyMeasurementsRouter = new Hono<Env>();

bodyMeasurementsRouter.use("*", authMiddleware);

// GET /api/v1/body-measurements
bodyMeasurementsRouter.get("/", async (c) => {
  const user = c.get("user")!;
  const { from, to } = c.req.query();

  // Get user settings for unit preference
  const settings = await c.env.DB.prepare(
    "SELECT preferred_weight_unit, preferred_length_unit FROM user_settings WHERE user_id = ?",
  )
    .bind(user.userId)
    .first<{ preferred_weight_unit: string; preferred_length_unit: string }>();

  const targetWeightUnit = settings?.preferred_weight_unit || "kg";
  const targetLengthUnit = settings?.preferred_length_unit || "cm";

  let query = `SELECT * FROM body_measurements WHERE user_id = ?`;
  const params: any[] = [user.userId];

  if (from) {
    query += ` AND date >= ?`;
    params.push(from);
  }
  if (to) {
    query += ` AND date <= ?`;
    params.push(to);
  }

  query += ` ORDER BY date ASC`;

  const { results: rawEntries } = await c.env.DB.prepare(query)
    .bind(...params)
    .all<any>();

  const measurements = rawEntries.map((entry) => {
    const entryWeightUnit = entry.weight_unit || "kg";
    const entryLengthUnit = entry.length_unit || "cm";

    return {
      ...entry,
      weight: convertWeight(entry.weight, entryWeightUnit, targetWeightUnit),
      weight_unit: targetWeightUnit,
      chest: convertLength(entry.chest, entryLengthUnit, targetLengthUnit),
      waist: convertLength(entry.waist, entryLengthUnit, targetLengthUnit),
      hips: convertLength(entry.hips, entryLengthUnit, targetLengthUnit),
      shoulders: convertLength(entry.shoulders, entryLengthUnit, targetLengthUnit),
      biceps: convertLength(entry.biceps, entryLengthUnit, targetLengthUnit),
      forearms: convertLength(entry.forearms, entryLengthUnit, targetLengthUnit),
      thighs: convertLength(entry.thighs, entryLengthUnit, targetLengthUnit),
      calves: convertLength(entry.calves, entryLengthUnit, targetLengthUnit),
      neck: convertLength(entry.neck, entryLengthUnit, targetLengthUnit),
      length_unit: targetLengthUnit,
    };
  });

  return c.json({ measurements });
});

// POST /api/v1/body-measurements
bodyMeasurementsRouter.post("/", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const {
    date,
    weight,
    weight_unit,
    body_fat_pct,
    chest,
    waist,
    hips,
    shoulders,
    biceps,
    forearms,
    thighs,
    calves,
    neck,
    length_unit,
  } = body;

  const logDate = date || new Date().toISOString().split("T")[0];

  const settings = await c.env.DB.prepare(
    "SELECT preferred_weight_unit, preferred_length_unit FROM user_settings WHERE user_id = ?",
  )
    .bind(user.userId)
    .first<{ preferred_weight_unit: string; preferred_length_unit: string }>();

  const wUnit = weight_unit || settings?.preferred_weight_unit || "kg";
  const lUnit = length_unit || settings?.preferred_length_unit || "cm";

  const id = `bm_${crypto.randomUUID()}`;

  await c.env.DB.prepare(
    `INSERT INTO body_measurements (
      id, user_id, date, weight, weight_unit, body_fat_pct,
      chest, waist, hips, shoulders, biceps, forearms, thighs, calves, neck, length_unit
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      user.userId,
      logDate,
      weight ?? null,
      wUnit,
      body_fat_pct ?? null,
      chest ?? null,
      waist ?? null,
      hips ?? null,
      shoulders ?? null,
      biceps ?? null,
      forearms ?? null,
      thighs ?? null,
      calves ?? null,
      neck ?? null,
      lUnit,
    )
    .run();

  const measurement = await c.env.DB.prepare("SELECT * FROM body_measurements WHERE id = ?")
    .bind(id)
    .first();
  return c.json({ message: "Body measurement recorded", measurement }, 201);
});

// GET /api/v1/body-measurements/:id
bodyMeasurementsRouter.get("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const measurement = await c.env.DB.prepare(
    "SELECT * FROM body_measurements WHERE id = ? AND user_id = ?",
  )
    .bind(id, user.userId)
    .first();

  if (!measurement) {
    return c.json({ error: "Body measurement entry not found" }, 404);
  }

  return c.json({ measurement });
});

// PUT /api/v1/body-measurements/:id
bodyMeasurementsRouter.put("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  const existing = await c.env.DB.prepare(
    "SELECT * FROM body_measurements WHERE id = ? AND user_id = ?",
  )
    .bind(id, user.userId)
    .first<any>();

  if (!existing) {
    return c.json({ error: "Body measurement entry not found or unauthorized" }, 404);
  }

  const {
    date,
    weight,
    weight_unit,
    body_fat_pct,
    chest,
    waist,
    hips,
    shoulders,
    biceps,
    forearms,
    thighs,
    calves,
    neck,
    length_unit,
  } = body;

  await c.env.DB.prepare(
    `UPDATE body_measurements
     SET date = COALESCE(?, date),
         weight = COALESCE(?, weight),
         weight_unit = COALESCE(?, weight_unit),
         body_fat_pct = COALESCE(?, body_fat_pct),
         chest = COALESCE(?, chest),
         waist = COALESCE(?, waist),
         hips = COALESCE(?, hips),
         shoulders = COALESCE(?, shoulders),
         biceps = COALESCE(?, biceps),
         forearms = COALESCE(?, forearms),
         thighs = COALESCE(?, thighs),
         calves = COALESCE(?, calves),
         neck = COALESCE(?, neck),
         length_unit = COALESCE(?, length_unit)
     WHERE id = ?`,
  )
    .bind(
      date ?? null,
      weight ?? null,
      weight_unit ?? null,
      body_fat_pct ?? null,
      chest ?? null,
      waist ?? null,
      hips ?? null,
      shoulders ?? null,
      biceps ?? null,
      forearms ?? null,
      thighs ?? null,
      calves ?? null,
      neck ?? null,
      length_unit ?? null,
      id,
    )
    .run();

  const updated = await c.env.DB.prepare("SELECT * FROM body_measurements WHERE id = ?")
    .bind(id)
    .first();
  return c.json({ message: "Body measurement updated", measurement: updated });
});

// DELETE /api/v1/body-measurements/:id
bodyMeasurementsRouter.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const existing = await c.env.DB.prepare(
    "SELECT id FROM body_measurements WHERE id = ? AND user_id = ?",
  )
    .bind(id, user.userId)
    .first();

  if (!existing) {
    return c.json({ error: "Body measurement entry not found or unauthorized" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM body_measurements WHERE id = ?").bind(id).run();
  return c.json({ message: "Body measurement deleted" });
});
