import { Hono } from "hono";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware } from "../middleware/auth";
import { convertLength, convertWeight } from "../utils/unit-converter";
import { getDb } from "../db/schema";
import { bodyMeasurements, userSettings } from "../db/schema";

export const bodyMeasurementsRouter = new Hono<Env>();

bodyMeasurementsRouter.use("*", authMiddleware);

// GET /api/v1/body-measurements
bodyMeasurementsRouter.get("/", async (c) => {
  const user = c.get("user")!;
  const { from, to } = c.req.query();
  const db = getDb(c);

  const settings = await db
    .select({
      preferredWeightUnit: userSettings.preferredWeightUnit,
      preferredLengthUnit: userSettings.preferredLengthUnit,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, user.userId))
    .get();

  const targetWeightUnit = settings?.preferredWeightUnit || "kg";
  const targetLengthUnit = settings?.preferredLengthUnit || "cm";

  const conditions = [eq(bodyMeasurements.userId, user.userId)];
  if (from) conditions.push(gte(bodyMeasurements.date, from));
  if (to) conditions.push(lte(bodyMeasurements.date, to));

  const rawEntries = await db
    .select()
    .from(bodyMeasurements)
    .where(and(...conditions))
    .orderBy(asc(bodyMeasurements.date))
    .all();

  const measurements = rawEntries.map((entry) => {
    const entryWeightUnit = entry.weightUnit || "kg";
    const entryLengthUnit = entry.lengthUnit || "cm";

    return {
      ...entry,
      weight: convertWeight(entry.weight, entryWeightUnit, targetWeightUnit),
      weightUnit: targetWeightUnit,
      chest: convertLength(entry.chest, entryLengthUnit, targetLengthUnit),
      waist: convertLength(entry.waist, entryLengthUnit, targetLengthUnit),
      hips: convertLength(entry.hips, entryLengthUnit, targetLengthUnit),
      shoulders: convertLength(entry.shoulders, entryLengthUnit, targetLengthUnit),
      biceps: convertLength(entry.biceps, entryLengthUnit, targetLengthUnit),
      forearms: convertLength(entry.forearms, entryLengthUnit, targetLengthUnit),
      thighs: convertLength(entry.thighs, entryLengthUnit, targetLengthUnit),
      calves: convertLength(entry.calves, entryLengthUnit, targetLengthUnit),
      neck: convertLength(entry.neck, entryLengthUnit, targetLengthUnit),
      lengthUnit: targetLengthUnit,
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
  const db = getDb(c);

  const settings = await db
    .select({
      preferredWeightUnit: userSettings.preferredWeightUnit,
      preferredLengthUnit: userSettings.preferredLengthUnit,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, user.userId))
    .get();

  const wUnit = weight_unit || settings?.preferredWeightUnit || "kg";
  const lUnit = length_unit || settings?.preferredLengthUnit || "cm";
  const id = `bm_${crypto.randomUUID()}`;

  await db
    .insert(bodyMeasurements)
    .values({
      id,
      userId: user.userId,
      date: logDate,
      weight: weight ?? null,
      weightUnit: wUnit,
      bodyFatPct: body_fat_pct ?? null,
      chest: chest ?? null,
      waist: waist ?? null,
      hips: hips ?? null,
      shoulders: shoulders ?? null,
      biceps: biceps ?? null,
      forearms: forearms ?? null,
      thighs: thighs ?? null,
      calves: calves ?? null,
      neck: neck ?? null,
      lengthUnit: lUnit,
    })
    .run();

  const measurement = await db
    .select()
    .from(bodyMeasurements)
    .where(eq(bodyMeasurements.id, id))
    .get();
  return c.json({ message: "Body measurement recorded", measurement }, 201);
});

// GET /api/v1/body-measurements/:id
bodyMeasurementsRouter.get("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const db = getDb(c);

  const measurement = await db
    .select()
    .from(bodyMeasurements)
    .where(and(eq(bodyMeasurements.id, id), eq(bodyMeasurements.userId, user.userId)))
    .get();

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
  const db = getDb(c);

  const existing = await db
    .select({ id: bodyMeasurements.id })
    .from(bodyMeasurements)
    .where(and(eq(bodyMeasurements.id, id), eq(bodyMeasurements.userId, user.userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Body measurement entry not found or unauthorized" }, 404);
  }

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

  const patch: Record<string, unknown> = {};
  if (date !== undefined) patch.date = date;
  if (weight !== undefined) patch.weight = weight;
  if (weight_unit !== undefined) patch.weightUnit = weight_unit;
  if (body_fat_pct !== undefined) patch.bodyFatPct = body_fat_pct;
  if (chest !== undefined) patch.chest = chest;
  if (waist !== undefined) patch.waist = waist;
  if (hips !== undefined) patch.hips = hips;
  if (shoulders !== undefined) patch.shoulders = shoulders;
  if (biceps !== undefined) patch.biceps = biceps;
  if (forearms !== undefined) patch.forearms = forearms;
  if (thighs !== undefined) patch.thighs = thighs;
  if (calves !== undefined) patch.calves = calves;
  if (neck !== undefined) patch.neck = neck;
  if (length_unit !== undefined) patch.lengthUnit = length_unit;

  if (Object.keys(patch).length > 0) {
    await db.update(bodyMeasurements).set(patch).where(eq(bodyMeasurements.id, id)).run();
  }

  const updated = await db.select().from(bodyMeasurements).where(eq(bodyMeasurements.id, id)).get();
  return c.json({ message: "Body measurement updated", measurement: updated });
});

// DELETE /api/v1/body-measurements/:id
bodyMeasurementsRouter.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const db = getDb(c);

  const existing = await db
    .select({ id: bodyMeasurements.id })
    .from(bodyMeasurements)
    .where(and(eq(bodyMeasurements.id, id), eq(bodyMeasurements.userId, user.userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Body measurement entry not found or unauthorized" }, 404);
  }

  await db.delete(bodyMeasurements).where(eq(bodyMeasurements.id, id)).run();
  return c.json({ message: "Body measurement deleted" });
});
