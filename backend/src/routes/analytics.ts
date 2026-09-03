import { Hono } from "hono";
import { eq, and, gte, lte, desc, asc, sql, count } from "drizzle-orm";
import type { Env } from "../index";
import { authMiddleware } from "../middleware/auth";
import { getDb } from "../db/schema";
import type { DrizzleDb } from "../db/schema";
import {
  workouts,
  workoutExercises,
  workoutSets,
  exercises,
  muscleGroups,
  personalRecords,
} from "../db/schema";

export const analyticsRouter = new Hono<Env>();

analyticsRouter.use("*", authMiddleware);

async function muscleSetCounts(
  db: DrizzleDb,
  userId: string,
  from?: string,
  to?: string,
): Promise<{ id: string; muscle_group: string; set_count: number }[]> {
  const conditions = [eq(workouts.userId, userId)];
  if (from) conditions.push(gte(workouts.startTime, from));
  if (to) conditions.push(lte(workouts.startTime, to));

  const results = await db
    .select({
      id: muscleGroups.id,
      muscle_group: muscleGroups.name,
      set_count: count(workoutSets.id),
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .innerJoin(muscleGroups, eq(exercises.muscleGroupId, muscleGroups.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(...conditions))
    .groupBy(muscleGroups.id)
    .orderBy(desc(count(workoutSets.id)))
    .all();

  return results as { id: string; muscle_group: string; set_count: number }[];
}

// GET /api/v1/analytics/performance?exerciseId=:id
analyticsRouter.get("/performance", async (c) => {
  const user = c.get("user")!;
  const exerciseId = c.req.query("exerciseId");

  if (!exerciseId) {
    return c.json({ error: "exerciseId parameter is required" }, 400);
  }

  const db = getDb(c);

  const exercise = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      category: exercises.category,
      target: exercises.target,
    })
    .from(exercises)
    .where(eq(exercises.id, exerciseId))
    .get();

  if (!exercise) {
    return c.json({ error: "Exercise not found" }, 404);
  }

  const rawRows = await db
    .select({
      workout_id: workouts.id,
      start_time: workouts.startTime,
      set_id: workoutSets.id,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      rpe: workoutSets.rpe,
      set_type: workoutSets.setType,
      estimated_1rm: workoutSets.estimated1rm,
      estimated_1rm_formula: workoutSets.estimated1rmFormula,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(workouts.userId, user.userId), eq(workoutExercises.exerciseId, exerciseId)))
    .orderBy(asc(workouts.startTime), asc(workoutSets.orderIndex))
    .all();

  const sessionsMap = new Map<string, { workoutId: string; date: string; sets: unknown[] }>();
  const oneRepMaxCurve: unknown[] = [];
  const maxWeightCurve: unknown[] = [];
  const maxRepsCurve: unknown[] = [];

  for (const row of rawRows) {
    if (!sessionsMap.has(row.workout_id)) {
      sessionsMap.set(row.workout_id, {
        workoutId: row.workout_id,
        date: row.start_time,
        sets: [],
      });
    }
    sessionsMap.get(row.workout_id)!.sets.push({
      setId: row.set_id,
      weight: row.weight,
      reps: row.reps,
      rpe: row.rpe,
      setType: row.set_type,
      estimated1RM: row.estimated_1rm,
    });
  }

  for (const session of sessionsMap.values()) {
    let max1RM = 0;
    let maxWeight = 0;
    let maxReps = 0;
    let maxRepsWeight = 0;

    for (const set of session.sets as { estimated1RM: number; weight: number; reps: number }[]) {
      if (set.estimated1RM > max1RM) max1RM = set.estimated1RM;
      if (set.weight > maxWeight) maxWeight = set.weight;
      if (set.reps > maxReps) {
        maxReps = set.reps;
        maxRepsWeight = set.weight;
      }
    }

    if (max1RM > 0) oneRepMaxCurve.push({ date: session.date, value: max1RM, formula: "epley" });
    if (maxWeight > 0) maxWeightCurve.push({ date: session.date, value: maxWeight });
    if (maxReps > 0)
      maxRepsCurve.push({ date: session.date, value: maxReps, weight: maxRepsWeight });
  }

  return c.json({
    exercise,
    oneRepMaxCurve,
    maxWeightCurve,
    maxRepsCurve,
    history: Array.from(sessionsMap.values()),
  });
});

// GET /api/v1/analytics/monthly-report?year=:year&month=:month
analyticsRouter.get("/monthly-report", async (c) => {
  const user = c.get("user")!;
  const now = new Date();
  const year = parseInt(c.req.query("year") || String(now.getFullYear()), 10);
  const month = parseInt(c.req.query("month") || String(now.getMonth() + 1), 10);

  const monthStr = String(month).padStart(2, "0");
  const startDate = `${year}-${monthStr}-01T00:00:00Z`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthStr = String(nextMonth).padStart(2, "0");
  const endDate = `${nextYear}-${nextMonthStr}-01T00:00:00Z`;

  const db = getDb(c);

  const totals = await db
    .select({
      totalWorkouts: sql<number>`COUNT(${workouts.id})`,
      totalVolume: sql<number>`COALESCE(SUM(${workouts.totalVolume}), 0)`,
      totalDurationSeconds: sql<number>`COALESCE(SUM(${workouts.durationSeconds}), 0)`,
    })
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, user.userId),
        gte(workouts.startTime, startDate),
        lte(workouts.startTime, endDate),
      ),
    )
    .get();

  const topPRs = await db
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
    .where(
      and(
        eq(personalRecords.userId, user.userId),
        gte(personalRecords.achievedAt, startDate),
        lte(personalRecords.achievedAt, endDate),
      ),
    )
    .orderBy(desc(personalRecords.value))
    .limit(5)
    .all();

  const muscleDistribution = await db
    .select({
      muscle_group: muscleGroups.name,
      set_count: count(workoutSets.id),
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .innerJoin(muscleGroups, eq(exercises.muscleGroupId, muscleGroups.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(
      and(
        eq(workouts.userId, user.userId),
        gte(workouts.startTime, startDate),
        lte(workouts.startTime, endDate),
      ),
    )
    .groupBy(muscleGroups.id)
    .all();

  return c.json({
    period: { year, month },
    totalWorkouts: totals?.totalWorkouts ?? 0,
    totalVolume: totals?.totalVolume ?? 0,
    totalDurationSeconds: totals?.totalDurationSeconds ?? 0,
    topPRs,
    muscleDistribution,
  });
});

// GET /api/v1/analytics/muscle-distribution?from=:date&to=:date
analyticsRouter.get("/muscle-distribution", async (c) => {
  const user = c.get("user")!;
  const { from, to } = c.req.query();
  const db = getDb(c);

  const results = await muscleSetCounts(db, user.userId, from, to);
  const totalSets = results.reduce((acc, cur) => acc + cur.set_count, 0);

  const distribution = results.map((r) => ({
    muscleGroupId: r.id,
    muscleGroup: r.muscle_group,
    setCount: r.set_count,
    percentage: totalSets > 0 ? Math.round((r.set_count / totalSets) * 1000) / 10 : 0,
  }));

  return c.json({ totalSets, distribution });
});

// GET /api/v1/analytics/sets-per-muscle-group?from=:date&to=:date
analyticsRouter.get("/sets-per-muscle-group", async (c) => {
  const user = c.get("user")!;
  const { from, to } = c.req.query();
  const db = getDb(c);

  const results = await muscleSetCounts(db, user.userId, from, to);

  const setsPerMuscleGroup = results.map((r) => ({
    muscleGroupId: r.id,
    muscleGroup: r.muscle_group,
    setCount: r.set_count,
    hypertrophyTargetMin: 10,
    hypertrophyTargetMax: 20,
  }));

  return c.json({ setsPerMuscleGroup });
});

// GET /api/v1/analytics/consistency
analyticsRouter.get("/consistency", async (c) => {
  const user = c.get("user")!;
  const db = getDb(c);

  const workoutList = await db
    .select({ id: workouts.id, startTime: workouts.startTime })
    .from(workouts)
    .where(eq(workouts.userId, user.userId))
    .orderBy(desc(workouts.startTime))
    .all();

  const activeDates = Array.from(new Set(workoutList.map((w) => w.startTime.split("T")[0])))
    .toSorted()
    .toReversed();

  let currentStreak = 0;
  let previousDate: Date | null = null;

  for (const dateStr of activeDates) {
    const d = new Date(dateStr);
    if (!previousDate) {
      currentStreak = 1;
      previousDate = d;
    } else {
      const diffDays = Math.round((previousDate.getTime() - d.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        currentStreak += 1;
        previousDate = d;
      } else {
        break;
      }
    }
  }

  return c.json({
    currentStreakDays: currentStreak,
    totalWorkouts: workoutList.length,
    activeDates,
  });
});

// GET /api/v1/analytics/year-in-review?year=:year
analyticsRouter.get("/year-in-review", async (c) => {
  const user = c.get("user")!;
  const now = new Date();
  const year = parseInt(c.req.query("year") || String(now.getFullYear()), 10);

  const startDate = `${year}-01-01T00:00:00Z`;
  const endDate = `${year + 1}-01-01T00:00:00Z`;

  const db = getDb(c);

  const totals = await db
    .select({
      totalWorkouts: sql<number>`COUNT(${workouts.id})`,
      totalVolume: sql<number>`COALESCE(SUM(${workouts.totalVolume}), 0)`,
      totalDurationSeconds: sql<number>`COALESCE(SUM(${workouts.durationSeconds}), 0)`,
    })
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, user.userId),
        gte(workouts.startTime, startDate),
        lte(workouts.startTime, endDate),
      ),
    )
    .get();

  const topPRs = await db
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
    .where(
      and(
        eq(personalRecords.userId, user.userId),
        gte(personalRecords.achievedAt, startDate),
        lte(personalRecords.achievedAt, endDate),
      ),
    )
    .orderBy(desc(personalRecords.value))
    .limit(10)
    .all();

  return c.json({
    year,
    totalWorkouts: totals?.totalWorkouts ?? 0,
    totalVolume: totals?.totalVolume ?? 0,
    totalDurationSeconds: totals?.totalDurationSeconds ?? 0,
    topPRs,
  });
});
