import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import type { Env } from "../index";
import { getDb } from "../db/schema";
import { personalRecords, exercises } from "../db/schema";

export const personalRecordsRouter = new Hono<Env>()
  .get("/", async (c) => {
    const user = c.get("user")!;
    const exerciseId = c.req.query("exerciseId");
    const db = getDb(c);

    const conditions = [eq(personalRecords.userId, user.userId)];
    if (exerciseId) conditions.push(eq(personalRecords.exerciseId, exerciseId));

    const results = await db
      .select({
        id: personalRecords.id,
        userId: personalRecords.userId,
        exerciseId: personalRecords.exerciseId,
        prType: personalRecords.prType,
        value: personalRecords.value,
        valueUnit: personalRecords.valueUnit,
        achievedAt: personalRecords.achievedAt,
        workoutSetId: personalRecords.workoutSetId,
        exerciseName: exercises.name,
      })
      .from(personalRecords)
      .innerJoin(exercises, eq(personalRecords.exerciseId, exercises.id))
      .where(and(...conditions))
      .orderBy(desc(personalRecords.achievedAt))
      .limit(500)
      .all();

    return c.json({ personalRecords: results });
  });
