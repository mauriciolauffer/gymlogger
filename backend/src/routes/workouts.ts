import { Hono } from "hono";
import { eq, and, gte, lte, desc, asc, max, sql, inArray } from "drizzle-orm";
import type { Env } from "../index";
import { calculate1RM } from "../utils/calculator";
import { checkAndUpdatePR } from "../utils/pr-detector";
import { getDb } from "../db/schema";
import type { DrizzleDb } from "../db/schema";
import {
  workouts,
  workoutExercises,
  workoutSets,
  userSettings,
  exercises,
  workoutTemplateExercises,
} from "../db/schema";

export const workoutsRouter = new Hono<Env>();

// GET /api/v1/workouts/previous-values?exerciseId=:id
workoutsRouter.get("/previous-values", async (c) => {
  const user = c.get("user")!;
  const exerciseId = c.req.query("exerciseId");

  if (!exerciseId) {
    return c.json({ error: "exerciseId parameter is required" }, 400);
  }

  const db = getDb(c);

  const previousExercise = await db
    .select({ id: workoutExercises.id, startTime: workouts.startTime })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .innerJoin(workoutSets, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .where(and(eq(workouts.userId, user.userId), eq(workoutExercises.exerciseId, exerciseId)))
    .orderBy(desc(workouts.startTime))
    .limit(1)
    .get();

  if (!previousExercise) {
    return c.json({ sets: [], previousWorkoutDate: null });
  }

  const sets = await db
    .select({
      id: workoutSets.id,
      setType: workoutSets.setType,
      weight: workoutSets.weight,
      weightUnit: workoutSets.weightUnit,
      reps: workoutSets.reps,
      rpe: workoutSets.rpe,
      orderIndex: workoutSets.orderIndex,
    })
    .from(workoutSets)
    .where(eq(workoutSets.workoutExerciseId, previousExercise.id))
    .orderBy(asc(workoutSets.orderIndex))
    .all();

  return c.json({ sets, previousWorkoutDate: previousExercise.startTime });
});

// POST /api/v1/workouts/start
workoutsRouter.post("/start", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json().catch(() => null);
  const db = getDb(c);

  const workoutId = `wk_${crypto.randomUUID()}`;
  const title = body?.title ?? "Workout";
  const startTime = body?.start_time || new Date().toISOString();
  const templateId = body?.template_id || null;

  const settings = await db
    .select({ preferredWeightUnit: userSettings.preferredWeightUnit })
    .from(userSettings)
    .where(eq(userSettings.userId, user.userId))
    .get();
  const weightUnit = settings?.preferredWeightUnit || "kg";

  await db
    .insert(workouts)
    .values({
      id: workoutId,
      userId: user.userId,
      templateId,
      title,
      startTime,
      totalVolume: 0,
      volumeUnit: weightUnit,
      setCount: 0,
    })
    .run();

  if (templateId) {
    const templateExs = await db
      .select({
        exerciseId: workoutTemplateExercises.exerciseId,
        supersetId: workoutTemplateExercises.supersetId,
        notes: workoutTemplateExercises.notes,
        orderIndex: workoutTemplateExercises.orderIndex,
      })
      .from(workoutTemplateExercises)
      .where(eq(workoutTemplateExercises.templateId, templateId))
      .orderBy(asc(workoutTemplateExercises.orderIndex))
      .all();

    await Promise.all(
      templateExs.map((te) => {
        const weId = `we_${crypto.randomUUID()}`;
        return db
          .insert(workoutExercises)
          .values({
            id: weId,
            workoutId,
            exerciseId: te.exerciseId,
            supersetId: te.supersetId,
            notes: te.notes,
            orderIndex: te.orderIndex,
          })
          .run();
      }),
    );
  }

  const workout = await db.select().from(workouts).where(eq(workouts.id, workoutId)).get();
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

  const db = getDb(c);

  const workout = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, user.userId)))
    .get();

  if (!workout) {
    return c.json({ error: "Workout session not found" }, 404);
  }

  const { exercise_id, superset_id, notes, order_index } = body;
  const weId = `we_${crypto.randomUUID()}`;

  let orderIdx = order_index;
  if (orderIdx === undefined || orderIdx === null) {
    const maxOrder = await db
      .select({ m: max(workoutExercises.orderIndex) })
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, workoutId))
      .get();
    orderIdx = (maxOrder?.m ?? -1) + 1;
  }

  await db
    .insert(workoutExercises)
    .values({
      id: weId,
      workoutId,
      exerciseId: exercise_id,
      supersetId: superset_id ?? null,
      notes: notes ?? null,
      orderIndex: orderIdx,
    })
    .run();

  const workoutExercise = await db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.id, weId))
    .get();
  return c.json({ message: "Exercise added to workout", workoutExercise }, 201);
});

async function updateWorkoutTotals(db: DrizzleDb, workoutId: string) {
  const stats = await db
    .select({
      totalVol: sql<number>`COALESCE(SUM(${workoutSets.weight} * ${workoutSets.reps}), 0)`,
      setCnt: sql<number>`COUNT(${workoutSets.id})`,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .where(eq(workoutExercises.workoutId, workoutId))
    .get();

  await db
    .update(workouts)
    .set({ totalVolume: stats?.totalVol ?? 0, setCount: stats?.setCnt ?? 0 })
    .where(eq(workouts.id, workoutId))
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

  const db = getDb(c);

  const workout = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, user.userId)))
    .get();

  if (!workout) {
    return c.json({ error: "Workout session not found" }, 404);
  }

  const { workout_exercise_id, set_type, weight, weight_unit, reps, rpe, order_index } = body;

  const setWeight = typeof weight === "number" ? weight : 0;
  const setReps = typeof reps === "number" ? reps : 0;
  const setType = set_type || "normal";
  const formula = "epley";
  const est1RM = calculate1RM(setWeight, setReps, formula);

  const settings = await db
    .select({ preferredWeightUnit: userSettings.preferredWeightUnit })
    .from(userSettings)
    .where(eq(userSettings.userId, user.userId))
    .get();
  const unit = weight_unit || settings?.preferredWeightUnit || "kg";

  let orderIdx = order_index;
  if (orderIdx === undefined || orderIdx === null) {
    const maxOrder = await db
      .select({ m: max(workoutSets.orderIndex) })
      .from(workoutSets)
      .where(eq(workoutSets.workoutExerciseId, workout_exercise_id))
      .get();
    orderIdx = (maxOrder?.m ?? -1) + 1;
  }

  const setId = `ws_${crypto.randomUUID()}`;

  await db
    .insert(workoutSets)
    .values({
      id: setId,
      workoutExerciseId: workout_exercise_id,
      setType,
      weight: setWeight,
      weightUnit: unit,
      reps: setReps,
      rpe: rpe ?? null,
      estimated1rm: est1RM,
      estimated1rmFormula: formula,
      orderIndex: orderIdx,
    })
    .run();

  // PR Detection
  const we = await db
    .select({ exerciseId: workoutExercises.exerciseId })
    .from(workoutExercises)
    .where(eq(workoutExercises.id, workout_exercise_id))
    .get();

  let prResult = { isPr: false, prTypes: [] as string[] };
  if (we) {
    prResult = await checkAndUpdatePR(
      db,
      user.userId,
      we.exerciseId,
      setId,
      setWeight,
      setReps,
      unit,
    );
  }

  await updateWorkoutTotals(db, workoutId);

  const loggedSet = await db.select().from(workoutSets).where(eq(workoutSets.id, setId)).get();
  return c.json(
    {
      message: "Set logged successfully",
      set: loggedSet
        ? {
            id: loggedSet.id,
            workout_exercise_id: loggedSet.workoutExerciseId,
            set_type: loggedSet.setType,
            weight: loggedSet.weight,
            weight_unit: loggedSet.weightUnit,
            reps: loggedSet.reps,
            rpe: loggedSet.rpe,
            estimated_1rm: loggedSet.estimated1rm,
            estimated_1rm_formula: loggedSet.estimated1rmFormula,
            is_pr: loggedSet.isPr ? 1 : 0,
            pr_type: loggedSet.prType,
            order_index: loggedSet.orderIndex,
          }
        : null,
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
  const db = getDb(c);

  const set = await db
    .select({
      id: workoutSets.id,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      setType: workoutSets.setType,
      rpe: workoutSets.rpe,
      weightUnit: workoutSets.weightUnit,
      exerciseId: workoutExercises.exerciseId,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(
      and(eq(workoutSets.id, setId), eq(workouts.id, workoutId), eq(workouts.userId, user.userId)),
    )
    .get();

  if (!set) {
    return c.json({ error: "Set not found or unauthorized" }, 404);
  }

  const newWeight = body?.weight !== undefined ? body.weight : set.weight;
  const newReps = body?.reps !== undefined ? body.reps : set.reps;
  const newSetType = body?.set_type !== undefined ? body.set_type : set.setType;
  const newRpe = body?.rpe !== undefined ? body.rpe : set.rpe;
  const newFormula = "epley";
  const newEst1RM = calculate1RM(newWeight, newReps, newFormula);

  await db
    .update(workoutSets)
    .set({
      setType: newSetType,
      weight: newWeight,
      reps: newReps,
      rpe: newRpe ?? null,
      estimated1rm: newEst1RM,
      estimated1rmFormula: newFormula,
    })
    .where(eq(workoutSets.id, setId))
    .run();

  const prResult = await checkAndUpdatePR(
    db,
    user.userId,
    set.exerciseId,
    setId,
    newWeight,
    newReps,
    set.weightUnit || "kg",
  );

  await updateWorkoutTotals(db, workoutId);

  const updatedSet = await db.select().from(workoutSets).where(eq(workoutSets.id, setId)).get();
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
  const db = getDb(c);

  const set = await db
    .select({ id: workoutSets.id })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(
      and(eq(workoutSets.id, setId), eq(workouts.id, workoutId), eq(workouts.userId, user.userId)),
    )
    .get();

  if (!set) {
    return c.json({ error: "Set not found or unauthorized" }, 404);
  }

  await db.delete(workoutSets).where(eq(workoutSets.id, setId)).run();
  await updateWorkoutTotals(db, workoutId);

  return c.json({ message: "Set deleted" });
});

// PUT /api/v1/workouts/:id/finish
workoutsRouter.put("/:id/finish", async (c) => {
  const user = c.get("user")!;
  const workoutId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const db = getDb(c);

  const workout = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, user.userId)))
    .get();

  if (!workout) {
    return c.json({ error: "Workout session not found" }, 404);
  }

  const endTime = new Date().toISOString();
  const startMs = new Date(workout.startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const durationSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));

  await updateWorkoutTotals(db, workoutId);

  await db
    .update(workouts)
    .set({
      endTime,
      durationSeconds,
      ...(body?.notes != null ? { notes: body.notes } : {}),
    })
    .where(eq(workouts.id, workoutId))
    .run();

  const finishedWorkout = await db.select().from(workouts).where(eq(workouts.id, workoutId)).get();
  return c.json({
    message: "Workout completed",
    workout: finishedWorkout
      ? {
          id: finishedWorkout.id,
          user_id: finishedWorkout.userId,
          template_id: finishedWorkout.templateId,
          title: finishedWorkout.title,
          start_time: finishedWorkout.startTime,
          end_time: finishedWorkout.endTime,
          duration_seconds: finishedWorkout.durationSeconds,
          total_volume: finishedWorkout.totalVolume,
          volume_unit: finishedWorkout.volumeUnit,
          set_count: finishedWorkout.setCount,
          has_pr: finishedWorkout.hasPr,
          notes: finishedWorkout.notes,
          created_at: finishedWorkout.createdAt,
        }
      : null,
  });
});

// GET /api/v1/workouts
workoutsRouter.get("/", async (c) => {
  const user = c.get("user")!;
  const { limit, offset, from, to } = c.req.query();
  const db = getDb(c);

  const conditions = [eq(workouts.userId, user.userId)];
  if (from) conditions.push(gte(workouts.startTime, from));
  if (to) conditions.push(lte(workouts.startTime, to));

  const limitVal = Math.min(Math.max(1, parseInt(limit || "20", 10)), 100);
  const offsetVal = Math.max(0, parseInt(offset || "0", 10));

  const results = await db
    .select()
    .from(workouts)
    .where(and(...conditions))
    .orderBy(desc(workouts.startTime))
    .limit(limitVal)
    .offset(offsetVal)
    .all();

  return c.json({ workouts: results });
});

// GET /api/v1/workouts/:id
workoutsRouter.get("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const db = getDb(c);

  const workout = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, user.userId)))
    .get();

  if (!workout) {
    return c.json({ error: "Workout not found" }, 404);
  }

  const workoutExerciseList = await db
    .select({
      id: workoutExercises.id,
      workoutId: workoutExercises.workoutId,
      exerciseId: workoutExercises.exerciseId,
      supersetId: workoutExercises.supersetId,
      notes: workoutExercises.notes,
      orderIndex: workoutExercises.orderIndex,
      exerciseName: exercises.name,
      category: exercises.category,
      equipment: exercises.equipment,
      muscleGroupId: exercises.muscleGroupId,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(eq(workoutExercises.workoutId, id))
    .orderBy(asc(workoutExercises.orderIndex))
    .all();

  const exerciseIds = workoutExerciseList.map((ex) => ex.id);
  const sets =
    exerciseIds.length > 0
      ? await db
          .select()
          .from(workoutSets)
          .where(inArray(workoutSets.workoutExerciseId, exerciseIds))
          .orderBy(asc(workoutSets.orderIndex))
          .all()
      : [];

  const setsByExercise = new Map<string, typeof sets>();
  for (const s of sets) {
    const key = s.workoutExerciseId;
    if (!setsByExercise.has(key)) setsByExercise.set(key, []);
    setsByExercise.get(key)!.push(s);
  }

  const exercisesWithSets = workoutExerciseList.map((ex) =>
    Object.assign(ex, { sets: setsByExercise.get(ex.id) ?? [] }),
  );

  return c.json({ workout: { ...workout, exercises: exercisesWithSets } });
});

// DELETE /api/v1/workouts/:id
workoutsRouter.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const db = getDb(c);

  const workout = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, user.userId)))
    .get();

  if (!workout) {
    return c.json({ error: "Workout not found" }, 404);
  }

  await db.delete(workouts).where(eq(workouts.id, id)).run();
  return c.json({ message: "Workout deleted" });
});
