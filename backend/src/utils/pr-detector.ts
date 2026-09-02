import { calculate1RM } from "./calculator";

export interface PRCheckResult {
  isPr: boolean;
  prTypes: string[];
}

export async function checkAndUpdatePR(
  db: D1Database,
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

  const est1RM = calculate1RM(weight, reps);
  const setVolume = weight * reps;

  const prTypesToTest = [
    { type: "1rm", value: est1RM },
    { type: "weight", value: weight },
    { type: "volume", value: setVolume },
    { type: "reps", value: reps },
  ];

  const brokenPRs: string[] = [];

  for (const item of prTypesToTest) {
    const existing = await db
      .prepare(
        `SELECT value FROM personal_records
         WHERE user_id = ? AND exercise_id = ? AND pr_type = ?`,
      )
      .bind(userId, exerciseId, item.type)
      .first<{ value: number }>();

    if (!existing || item.value > existing.value) {
      brokenPRs.push(item.type);

      const prId = `pr_${crypto.randomUUID()}`;
      await db
        .prepare(
          `INSERT INTO personal_records (id, user_id, exercise_id, pr_type, value, value_unit, achieved_at, workout_set_id)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
           ON CONFLICT(user_id, exercise_id, pr_type) DO UPDATE SET
             value = excluded.value,
             value_unit = excluded.value_unit,
             achieved_at = excluded.achieved_at,
             workout_set_id = excluded.workout_set_id`,
        )
        .bind(prId, userId, exerciseId, item.type, item.value, weightUnit, setId)
        .run();
    }
  }

  if (brokenPRs.length > 0) {
    const primaryPrType = brokenPRs.includes("1rm") ? "1rm" : brokenPRs[0];

    await db
      .prepare("UPDATE workout_sets SET is_pr = TRUE, pr_type = ? WHERE id = ?")
      .bind(primaryPrType, setId)
      .run();

    // Mark parent workout as having PR
    const set = await db
      .prepare(
        `SELECT we.workout_id FROM workout_sets ws
         JOIN workout_exercises we ON ws.workout_exercise_id = we.id
         WHERE ws.id = ?`,
      )
      .bind(setId)
      .first<{ workout_id: string }>();

    if (set?.workout_id) {
      await db.prepare("UPDATE workouts SET has_pr = TRUE WHERE id = ?").bind(set.workout_id).run();
    }

    return { isPr: true, prTypes: brokenPRs };
  }

  return { isPr: false, prTypes: [] };
}
