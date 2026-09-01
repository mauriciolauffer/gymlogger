import { Hono } from "hono";
import type { Env } from "../index";
import { authMiddleware } from "../middleware/auth";

export const analyticsRouter = new Hono<Env>();

analyticsRouter.use("*", authMiddleware);

// GET /api/v1/analytics/performance?exerciseId=:id
analyticsRouter.get("/performance", async (c) => {
  const user = c.get("user")!;
  const exerciseId = c.req.query("exerciseId");

  if (!exerciseId) {
    return c.json({ error: "exerciseId parameter is required" }, 400);
  }

  const exercise = await c.env.DB.prepare(
    "SELECT id, name, category, target FROM exercises WHERE id = ?",
  )
    .bind(exerciseId)
    .first();

  if (!exercise) {
    return c.json({ error: "Exercise not found" }, 404);
  }

  const { results: rawRows } = await c.env.DB.prepare(
    `SELECT
       w.id as workout_id,
       w.start_time,
       ws.id as set_id,
       ws.weight,
       ws.reps,
       ws.rpe,
       ws.set_type,
       ws.estimated_1rm,
       ws.estimated_1rm_formula
     FROM workout_sets ws
     JOIN workout_exercises we ON ws.workout_exercise_id = we.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE w.user_id = ? AND we.exercise_id = ?
     ORDER BY w.start_time ASC, ws.order_index ASC`,
  )
    .bind(user.userId, exerciseId)
    .all<any>();

  const sessionsMap = new Map<string, any>();
  const oneRepMaxCurve: any[] = [];
  const maxWeightCurve: any[] = [];
  const maxRepsCurve: any[] = [];

  for (const row of rawRows) {
    if (!sessionsMap.has(row.workout_id)) {
      sessionsMap.set(row.workout_id, {
        workoutId: row.workout_id,
        date: row.start_time,
        sets: [],
      });
    }

    sessionsMap.get(row.workout_id).sets.push({
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

    for (const set of session.sets) {
      if (set.estimated1RM > max1RM) max1RM = set.estimated1RM;
      if (set.weight > maxWeight) maxWeight = set.weight;
      if (set.reps > maxReps) {
        maxReps = set.reps;
        maxRepsWeight = set.weight;
      }
    }

    if (max1RM > 0) {
      oneRepMaxCurve.push({ date: session.date, value: max1RM, formula: "epley" });
    }
    if (maxWeight > 0) {
      maxWeightCurve.push({ date: session.date, value: maxWeight });
    }
    if (maxReps > 0) {
      maxRepsCurve.push({ date: session.date, value: maxReps, weight: maxRepsWeight });
    }
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

  const monthStr = month < 10 ? `0${month}` : `${month}`;
  const startDate = `${year}-${monthStr}-01T00:00:00Z`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthStr = nextMonth < 10 ? `0${nextMonth}` : `${nextMonth}`;
  const endDate = `${nextYear}-${nextMonthStr}-01T00:00:00Z`;

  const totals = await c.env.DB.prepare(
    `SELECT
       COUNT(id) as totalWorkouts,
       COALESCE(SUM(total_volume), 0) as totalVolume,
       COALESCE(SUM(duration_seconds), 0) as totalDurationSeconds
     FROM workouts
     WHERE user_id = ? AND start_time >= ? AND start_time < ?`,
  )
    .bind(user.userId, startDate, endDate)
    .first<any>();

  const { results: topPRs } = await c.env.DB.prepare(
    `SELECT pr.*, e.name as exercise_name
     FROM personal_records pr
     JOIN exercises e ON pr.exercise_id = e.id
     WHERE pr.user_id = ? AND pr.achieved_at >= ? AND pr.achieved_at < ?
     ORDER BY pr.value DESC
     LIMIT 5`,
  )
    .bind(user.userId, startDate, endDate)
    .all();

  // Muscle group set counts in month
  const { results: muscleDistribution } = await c.env.DB.prepare(
    `SELECT mg.name as muscle_group, COUNT(ws.id) as set_count
     FROM workout_sets ws
     JOIN workout_exercises we ON ws.workout_exercise_id = we.id
     JOIN exercises e ON we.exercise_id = e.id
     JOIN muscle_groups mg ON e.muscle_group_id = mg.id
     JOIN workouts w ON we.workout_id = w.id
     WHERE w.user_id = ? AND w.start_time >= ? AND w.start_time < ?
     GROUP BY mg.id`,
  )
    .bind(user.userId, startDate, endDate)
    .all<any>();

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

  let query = `
    SELECT mg.id, mg.name as muscle_group, COUNT(ws.id) as set_count
    FROM workout_sets ws
    JOIN workout_exercises we ON ws.workout_exercise_id = we.id
    JOIN exercises e ON we.exercise_id = e.id
    JOIN muscle_groups mg ON e.muscle_group_id = mg.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE w.user_id = ?
  `;
  const params: any[] = [user.userId];

  if (from) {
    query += ` AND w.start_time >= ?`;
    params.push(from);
  }
  if (to) {
    query += ` AND w.start_time <= ?`;
    params.push(to);
  }

  query += ` GROUP BY mg.id ORDER BY set_count DESC`;

  const { results } = await c.env.DB.prepare(query)
    .bind(...params)
    .all<any>();
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

  let query = `
    SELECT mg.id, mg.name as muscle_group, COUNT(ws.id) as set_count
    FROM workout_sets ws
    JOIN workout_exercises we ON ws.workout_exercise_id = we.id
    JOIN exercises e ON we.exercise_id = e.id
    JOIN muscle_groups mg ON e.muscle_group_id = mg.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE w.user_id = ?
  `;
  const params: any[] = [user.userId];

  if (from) {
    query += ` AND w.start_time >= ?`;
    params.push(from);
  }
  if (to) {
    query += ` AND w.start_time <= ?`;
    params.push(to);
  }

  query += ` GROUP BY mg.id`;

  const { results } = await c.env.DB.prepare(query)
    .bind(...params)
    .all<any>();

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

  const { results: workouts } = await c.env.DB.prepare(
    `SELECT id, start_time FROM workouts WHERE user_id = ? ORDER BY start_time DESC`,
  )
    .bind(user.userId)
    .all<any>();

  // Calculate workout streak in consecutive active days/weeks
  const activeDates = Array.from(new Set(workouts.map((w) => w.start_time.split("T")[0])))
    .sort()
    .reverse();

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
    totalWorkouts: workouts.length,
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

  const totals = await c.env.DB.prepare(
    `SELECT
       COUNT(id) as totalWorkouts,
       COALESCE(SUM(total_volume), 0) as totalVolume,
       COALESCE(SUM(duration_seconds), 0) as totalDurationSeconds
     FROM workouts
     WHERE user_id = ? AND start_time >= ? AND start_time < ?`,
  )
    .bind(user.userId, startDate, endDate)
    .first<any>();

  const { results: topPRs } = await c.env.DB.prepare(
    `SELECT pr.*, e.name as exercise_name
     FROM personal_records pr
     JOIN exercises e ON pr.exercise_id = e.id
     WHERE pr.user_id = ? AND pr.achieved_at >= ? AND pr.achieved_at < ?
     ORDER BY pr.value DESC
     LIMIT 10`,
  )
    .bind(user.userId, startDate, endDate)
    .all();

  return c.json({
    year,
    totalWorkouts: totals?.totalWorkouts ?? 0,
    totalVolume: totals?.totalVolume ?? 0,
    totalDurationSeconds: totals?.totalDurationSeconds ?? 0,
    topPRs,
  });
});
