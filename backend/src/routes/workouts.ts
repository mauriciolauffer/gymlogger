import { Hono } from "hono";
import type { Env } from "../index";
import { authMiddleware } from "../middleware/auth";
import { calculate1RM } from "../utils/calculator";
import { checkAndUpdatePR } from "../utils/pr-detector";

export const workoutsRouter = new Hono<Env>();

workoutsRouter.use("*", authMiddleware);

// GET /api/v1/workouts/previous-values?exerciseId=:id
workoutsRouter.get("/previous-values", async (c) => {
  const user = c.get("user")!;
  const exerciseId = c.req.query("exerciseId");

  if (!exerciseId) {
    return c.json({ error: "exerciseId parameter is required" }, 400);
  }

  const previousExercise = await c.env.DB.prepare(
    `SELECT we.id, w.start_time
     FROM workout_exercises we
     JOIN workouts w ON we.workout_id = w.id
     JOIN workout_sets ws ON ws.workout_exercise_id = we.id
     WHERE w.user_id = ? AND we.exercise_id = ?
     ORDER BY w.start_time DESC
     LIMIT 1`,
  )
    .bind(user.userId, exerciseId)
    .first<{ id: string; start_time: string }>();

  if (!previousExercise) {
    return c.json({ sets: [], previousWorkoutDate: null });
  }

  const { results: sets } = await c.env.DB.prepare(
    `SELECT id, set_type, weight, weight_unit, reps, rpe, order_index
     FROM workout_sets
     WHERE workout_exercise_id = ?
     ORDER BY order_index ASC`,
  )
    .bind(previousExercise.id)
    .all();

  return c.json({ sets, previousWorkoutDate: previousExercise.start_time });
});

// POST /api/v1/workouts/start
workoutsRouter.post("/start", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json().catch(() => ({}));

  const workoutId = `wk_${crypto.randomUUID()}`;
  const title = body?.title || "Workout";
  const startTime = body?.start_time || new Date().toISOString();
  const templateId = body?.template_id || null;

  const settings = await c.env.DB.prepare(
    "SELECT preferred_weight_unit FROM user_settings WHERE user_id = ?",
  )
    .bind(user.userId)
    .first<{ preferred_weight_unit: string }>();
  const weightUnit = settings?.preferred_weight_unit || "kg";

  await c.env.DB.prepare(
    `INSERT INTO workouts (id, user_id, template_id, title, start_time, total_volume, volume_unit, set_count)
     VALUES (?, ?, ?, ?, ?, 0, ?, 0)`,
  )
    .bind(workoutId, user.userId, templateId, title, startTime, weightUnit)
    .run();

  if (templateId) {
    const { results: templateExercises } = await c.env.DB.prepare(
      `SELECT exercise_id, superset_id, notes, order_index
       FROM workout_template_exercises
       WHERE template_id = ?
       ORDER BY order_index ASC`,
    )
      .bind(templateId)
      .all<{
        exercise_id: string;
        superset_id: string | null;
        notes: string | null;
        order_index: number;
      }>();

    for (const te of templateExercises) {
      const weId = `we_${crypto.randomUUID()}`;
      await c.env.DB.prepare(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, superset_id, notes, order_index)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(weId, workoutId, te.exercise_id, te.superset_id, te.notes, te.order_index)
        .run();
    }
  }

  const workout = await c.env.DB.prepare("SELECT * FROM workouts WHERE id = ?")
    .bind(workoutId)
    .first();
  return c.json({ message: "Workout session started", workout }, 201);
});

// POST /api/v1/workouts/:id/exercises
workoutsRouter.post("/:id/exercises", async (c) => {
  const user = c.get("user")!;
  const workoutId = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  if (!body || !body.exercise_id) {
    return c.json({ error: "exercise_id is required" }, 400);
  }

  const workout = await c.env.DB.prepare("SELECT id FROM workouts WHERE id = ? AND user_id = ?")
    .bind(workoutId, user.userId)
    .first();

  if (!workout) {
    return c.json({ error: "Workout session not found" }, 404);
  }

  const { exercise_id, superset_id, notes, order_index } = body;
  const weId = `we_${crypto.randomUUID()}`;

  let orderIdx = order_index;
  if (orderIdx === undefined || orderIdx === null) {
    const maxOrder = await c.env.DB.prepare(
      "SELECT MAX(order_index) as m FROM workout_exercises WHERE workout_id = ?",
    )
      .bind(workoutId)
      .first<{ m: number | null }>();
    orderIdx = (maxOrder?.m ?? -1) + 1;
  }

  await c.env.DB.prepare(
    `INSERT INTO workout_exercises (id, workout_id, exercise_id, superset_id, notes, order_index)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(weId, workoutId, exercise_id, superset_id ?? null, notes ?? null, orderIdx)
    .run();

  const workoutExercise = await c.env.DB.prepare("SELECT * FROM workout_exercises WHERE id = ?")
    .bind(weId)
    .first();
  return c.json({ message: "Exercise added to workout", workoutExercise }, 201);
});

async function updateWorkoutTotals(db: D1Database, workoutId: string) {
  const stats = await db
    .prepare(
      `SELECT
         COALESCE(SUM(ws.weight * ws.reps), 0) as total_vol,
         COUNT(ws.id) as set_cnt
       FROM workout_sets ws
       JOIN workout_exercises we ON ws.workout_exercise_id = we.id
       WHERE we.workout_id = ?`,
    )
    .bind(workoutId)
    .first<{ total_vol: number; set_cnt: number }>();

  await db
    .prepare("UPDATE workouts SET total_volume = ?, set_count = ? WHERE id = ?")
    .bind(stats?.total_vol ?? 0, stats?.set_cnt ?? 0, workoutId)
    .run();
}

// POST /api/v1/workouts/:id/sets
workoutsRouter.post("/:id/sets", async (c) => {
  const user = c.get("user")!;
  const workoutId = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  if (!body || !body.workout_exercise_id) {
    return c.json({ error: "workout_exercise_id is required" }, 400);
  }

  const workout = await c.env.DB.prepare("SELECT id FROM workouts WHERE id = ? AND user_id = ?")
    .bind(workoutId, user.userId)
    .first();

  if (!workout) {
    return c.json({ error: "Workout session not found" }, 404);
  }

  const { workout_exercise_id, set_type, weight, weight_unit, reps, rpe, order_index } = body;

  const setWeight = typeof weight === "number" ? weight : 0;
  const setReps = typeof reps === "number" ? reps : 0;
  const setType = set_type || "normal";
  const formula = "epley";
  const est1RM = calculate1RM(setWeight, setReps, formula);

  const settings = await c.env.DB.prepare(
    "SELECT preferred_weight_unit FROM user_settings WHERE user_id = ?",
  )
    .bind(user.userId)
    .first<{ preferred_weight_unit: string }>();
  const unit = weight_unit || settings?.preferred_weight_unit || "kg";

  let orderIdx = order_index;
  if (orderIdx === undefined || orderIdx === null) {
    const maxOrder = await c.env.DB.prepare(
      "SELECT MAX(order_index) as m FROM workout_sets WHERE workout_exercise_id = ?",
    )
      .bind(workout_exercise_id)
      .first<{ m: number | null }>();
    orderIdx = (maxOrder?.m ?? -1) + 1;
  }

  const setId = `ws_${crypto.randomUUID()}`;

  await c.env.DB.prepare(
    `INSERT INTO workout_sets (
      id, workout_exercise_id, set_type, weight, weight_unit, reps, rpe, estimated_1rm, estimated_1rm_formula, order_index
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      setId,
      workout_exercise_id,
      setType,
      setWeight,
      unit,
      setReps,
      rpe ?? null,
      est1RM,
      formula,
      orderIdx,
    )
    .run();

  // PR Detection
  const we = await c.env.DB.prepare("SELECT exercise_id FROM workout_exercises WHERE id = ?")
    .bind(workout_exercise_id)
    .first<{ exercise_id: string }>();

  let prResult = { isPr: false, prTypes: [] as string[] };
  if (we) {
    prResult = await checkAndUpdatePR(
      c.env.DB,
      user.userId,
      we.exercise_id,
      setId,
      setWeight,
      setReps,
      unit,
    );
  }

  await updateWorkoutTotals(c.env.DB, workoutId);

  const loggedSet = await c.env.DB.prepare("SELECT * FROM workout_sets WHERE id = ?")
    .bind(setId)
    .first();
  return c.json(
    {
      message: "Set logged successfully",
      set: loggedSet,
      isPr: prResult.isPr,
      prTypes: prResult.prTypes,
    },
    201,
  );
});

// PUT /api/v1/workouts/:id/sets/:setId
workoutsRouter.put("/:id/sets/:setId", async (c) => {
  const user = c.get("user")!;
  const workoutId = c.req.param("id");
  const setId = c.req.param("setId");
  const body = await c.req.json().catch(() => null);

  const set = await c.env.DB.prepare(
    `SELECT ws.*, we.exercise_id FROM workout_sets ws
     JOIN workout_exercises we ON ws.workout_exercise_id = we.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE ws.id = ? AND w.id = ? AND w.user_id = ?`,
  )
    .bind(setId, workoutId, user.userId)
    .first<any>();

  if (!set) {
    return c.json({ error: "Set not found or unauthorized" }, 404);
  }

  const newWeight = body?.weight !== undefined ? body.weight : set.weight;
  const newReps = body?.reps !== undefined ? body.reps : set.reps;
  const newSetType = body?.set_type !== undefined ? body.set_type : set.set_type;
  const newRpe = body?.rpe !== undefined ? body.rpe : set.rpe;
  const newFormula = "epley";
  const newEst1RM = calculate1RM(newWeight, newReps, newFormula);

  await c.env.DB.prepare(
    `UPDATE workout_sets
     SET set_type = ?, weight = ?, reps = ?, rpe = ?, estimated_1rm = ?, estimated_1rm_formula = ?
     WHERE id = ?`,
  )
    .bind(newSetType, newWeight, newReps, newRpe ?? null, newEst1RM, newFormula, setId)
    .run();

  const prResult = await checkAndUpdatePR(
    c.env.DB,
    user.userId,
    set.exercise_id,
    setId,
    newWeight,
    newReps,
    set.weight_unit || "kg",
  );

  await updateWorkoutTotals(c.env.DB, workoutId);

  const updatedSet = await c.env.DB.prepare("SELECT * FROM workout_sets WHERE id = ?")
    .bind(setId)
    .first();
  return c.json({
    message: "Set updated",
    set: updatedSet,
    isPr: prResult.isPr,
    prTypes: prResult.prTypes,
  });
});

// DELETE /api/v1/workouts/:id/sets/:setId
workoutsRouter.delete("/:id/sets/:setId", async (c) => {
  const user = c.get("user")!;
  const workoutId = c.req.param("id");
  const setId = c.req.param("setId");

  const set = await c.env.DB.prepare(
    `SELECT ws.id FROM workout_sets ws
     JOIN workout_exercises we ON ws.workout_exercise_id = we.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE ws.id = ? AND w.id = ? AND w.user_id = ?`,
  )
    .bind(setId, workoutId, user.userId)
    .first();

  if (!set) {
    return c.json({ error: "Set not found or unauthorized" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM workout_sets WHERE id = ?").bind(setId).run();
  await updateWorkoutTotals(c.env.DB, workoutId);

  return c.json({ message: "Set deleted" });
});

// PUT /api/v1/workouts/:id/finish
workoutsRouter.put("/:id/finish", async (c) => {
  const user = c.get("user")!;
  const workoutId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  const workout = await c.env.DB.prepare("SELECT * FROM workouts WHERE id = ? AND user_id = ?")
    .bind(workoutId, user.userId)
    .first<any>();

  if (!workout) {
    return c.json({ error: "Workout session not found" }, 404);
  }

  const endTime = new Date().toISOString();
  const startMs = new Date(workout.start_time).getTime();
  const endMs = new Date(endTime).getTime();
  const durationSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));

  await updateWorkoutTotals(c.env.DB, workoutId);

  await c.env.DB.prepare(
    `UPDATE workouts
     SET end_time = ?, duration_seconds = ?, notes = COALESCE(?, notes)
     WHERE id = ?`,
  )
    .bind(endTime, durationSeconds, body?.notes ?? null, workoutId)
    .run();

  const finishedWorkout = await c.env.DB.prepare("SELECT * FROM workouts WHERE id = ?")
    .bind(workoutId)
    .first();
  return c.json({ message: "Workout completed", workout: finishedWorkout });
});

// GET /api/v1/workouts
workoutsRouter.get("/", async (c) => {
  const user = c.get("user")!;
  const { limit, offset, from, to } = c.req.query();

  let query = `SELECT * FROM workouts WHERE user_id = ?`;
  const params: any[] = [user.userId];

  if (from) {
    query += ` AND start_time >= ?`;
    params.push(from);
  }

  if (to) {
    query += ` AND start_time <= ?`;
    params.push(to);
  }

  query += ` ORDER BY start_time DESC`;

  const l = parseInt(limit || "20", 10);
  const o = parseInt(offset || "0", 10);
  query += ` LIMIT ? OFFSET ?`;
  params.push(l, o);

  const { results: workouts } = await c.env.DB.prepare(query)
    .bind(...params)
    .all();
  return c.json({ workouts });
});

// GET /api/v1/workouts/:id
workoutsRouter.get("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const workout = await c.env.DB.prepare("SELECT * FROM workouts WHERE id = ? AND user_id = ?")
    .bind(id, user.userId)
    .first();

  if (!workout) {
    return c.json({ error: "Workout not found" }, 404);
  }

  const { results: exercises } = await c.env.DB.prepare(
    `SELECT we.*, e.name as exercise_name, e.category, e.equipment, e.muscle_group_id
     FROM workout_exercises we
     JOIN exercises e ON we.exercise_id = e.id
     WHERE we.workout_id = ?
     ORDER BY we.order_index ASC`,
  )
    .bind(id)
    .all();

  for (const ex of exercises as any[]) {
    const { results: sets } = await c.env.DB.prepare(
      `SELECT * FROM workout_sets WHERE workout_exercise_id = ? ORDER BY order_index ASC`,
    )
      .bind(ex.id)
      .all();
    ex.sets = sets;
  }

  return c.json({ workout: { ...workout, exercises } });
});

// DELETE /api/v1/workouts/:id
workoutsRouter.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const workout = await c.env.DB.prepare("SELECT id FROM workouts WHERE id = ? AND user_id = ?")
    .bind(id, user.userId)
    .first();

  if (!workout) {
    return c.json({ error: "Workout not found" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM workouts WHERE id = ?").bind(id).run();
  return c.json({ message: "Workout deleted" });
});
