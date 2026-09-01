import { Hono } from "hono";
import type { Env } from "../index";
import { authMiddleware } from "../middleware/auth";

export const liveActivityRouter = new Hono<Env>();

liveActivityRouter.use("*", authMiddleware);

// GET /api/v1/workouts/:id/live
liveActivityRouter.get("/:id/live", async (c) => {
  const user = c.get("user")!;
  const workoutId = c.req.param("id");

  const workout = await c.env.DB.prepare("SELECT * FROM workouts WHERE id = ? AND user_id = ?")
    .bind(workoutId, user.userId)
    .first<any>();

  if (!workout) {
    return c.json({ error: "Workout session not found" }, 404);
  }

  const settings = await c.env.DB.prepare(
    "SELECT rest_timer_duration_seconds FROM user_settings WHERE user_id = ?",
  )
    .bind(user.userId)
    .first<{ rest_timer_duration_seconds: number }>();

  const restDurationSeconds = settings?.rest_timer_duration_seconds ?? 90;

  const lastSet = await c.env.DB.prepare(
    `SELECT ws.id, ws.weight, ws.reps, ws.weight_unit
     FROM workout_sets ws
     JOIN workout_exercises we ON ws.workout_exercise_id = we.id
     WHERE we.workout_id = ?
     ORDER BY ws.rowid DESC
     LIMIT 1`,
  )
    .bind(workoutId)
    .first<any>();

  const startMs = new Date(workout.start_time).getTime();
  const nowMs = Date.now();
  const elapsedSeconds = workout.end_time
    ? workout.duration_seconds
    : Math.max(0, Math.floor((nowMs - startMs) / 1000));

  return c.json({
    workoutId,
    status: workout.end_time ? "completed" : "active",
    elapsedSeconds,
    restTimerDurationSeconds: restDurationSeconds,
    lastSet: lastSet || null,
  });
});
