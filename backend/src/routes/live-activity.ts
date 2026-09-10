import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import type { Env } from "../index";
import { getDb } from "../db/schema";
import { workouts, workoutExercises, workoutSets, userSettings } from "../db/schema";

export const liveActivityRouter = new Hono<Env>().get("/:id/live", async (c) => {
  const user = c.get("user")!;
  const workoutId = c.req.param("id");
  const db = getDb(c);

  const workout = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, user.userId)))
    .get();

  if (!workout) {
    return c.json({ error: "Workout session not found" }, 404);
  }

  const settings = await db
    .select({ restTimerDurationSeconds: userSettings.restTimerDurationSeconds })
    .from(userSettings)
    .where(eq(userSettings.userId, user.userId))
    .get();

  const restDurationSeconds = settings?.restTimerDurationSeconds ?? 90;

  const lastSet = await db
    .select({
      id: workoutSets.id,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      weightUnit: workoutSets.weightUnit,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(desc(workoutSets.orderIndex))
    .limit(1)
    .get();

  const startMs = new Date(workout.startTime).getTime();
  const nowMs = Date.now();
  const elapsedSeconds = workout.endTime
    ? workout.durationSeconds
    : Math.max(0, Math.floor((nowMs - startMs) / 1000));

  return c.json({
    workoutId,
    status: workout.endTime ? "completed" : "active",
    elapsedSeconds,
    restTimerDurationSeconds: restDurationSeconds,
    lastSet: lastSet || null,
  });
});
