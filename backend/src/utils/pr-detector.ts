import { eq, and } from "drizzle-orm";
import { calculate1RM } from "./calculator";
import type { DrizzleDb } from "../db/schema";
import { personalRecords, workoutSets, workoutExercises, workouts } from "../db/schema";

export interface PRCheckResult {
  isPr: boolean;
  prTypes: string[];
}

export async function checkAndUpdatePR(
  db: DrizzleDb,
  userId: string,
  exerciseId: string,
  setId: string,
  weight: number,
  reps: number,
  weightUnit: string,
): Promise<PRCheckResult> {
  if (weight <= 0 || reps <= 0) {
    return { isPr: false, prTypes: [] };
  }

  try {
    const est1RM = calculate1RM(weight, reps);
    const setVolume = weight * reps;

    const prTypesToTest = [
      { type: "1rm", value: est1RM },
      { type: "weight", value: weight },
      { type: "volume", value: setVolume },
      { type: "reps", value: reps },
    ];

    const existingValues = await Promise.all(
      prTypesToTest.map((item) =>
        db
          .select({ value: personalRecords.value })
          .from(personalRecords)
          .where(
            and(
              eq(personalRecords.userId, userId),
              eq(personalRecords.exerciseId, exerciseId),
              eq(personalRecords.prType, item.type),
            ),
          )
          .get(),
      ),
    );

    const broken = prTypesToTest.filter(
      (item, i) => !existingValues[i] || item.value > existingValues[i]!.value,
    );

    if (broken.length === 0) {
      return { isPr: false, prTypes: [] };
    }

    await Promise.all(
      broken.map((item) => {
        const prId = `pr_${crypto.randomUUID()}`;
        return db
          .insert(personalRecords)
          .values({
            id: prId,
            userId,
            exerciseId,
            prType: item.type,
            value: item.value,
            valueUnit: weightUnit,
            achievedAt: new Date().toISOString(),
            workoutSetId: setId,
          })
          .onConflictDoUpdate({
            target: [personalRecords.userId, personalRecords.exerciseId, personalRecords.prType],
            set: {
              value: item.value,
              valueUnit: weightUnit,
              achievedAt: new Date().toISOString(),
              workoutSetId: setId,
            },
          })
          .run();
      }),
    );

    const brokenTypes = broken.map((b) => b.type);
    const primaryPrType = brokenTypes.includes("1rm") ? "1rm" : brokenTypes[0];

    await db
      .update(workoutSets)
      .set({ isPr: true, prType: primaryPrType })
      .where(eq(workoutSets.id, setId))
      .run();

    const setRow = await db
      .select({ workoutId: workoutExercises.workoutId })
      .from(workoutSets)
      .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
      .where(eq(workoutSets.id, setId))
      .get();

    if (setRow?.workoutId) {
      await db.update(workouts).set({ hasPr: true }).where(eq(workouts.id, setRow.workoutId)).run();
    }

    return { isPr: true, prTypes: brokenTypes };
  } catch (err) {
    console.error("PR check failed:", err);
    return { isPr: false, prTypes: [] };
  }
}
