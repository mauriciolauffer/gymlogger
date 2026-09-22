import { Hono } from "hono";
import type { Env } from "../index.js";
import { authMiddleware } from "../middleware/auth.js";
import { usersRouter } from "./users.js";
import { exercisesRouter } from "./exercises.js";
import { workoutsRouter } from "./workouts.js";
import { workoutTemplatesRouter } from "./workout-templates.js";
import { liveActivityRouter } from "./live-activity.js";
import { personalRecordsRouter } from "./personal-records.js";
import { calculatorsRouter } from "./calculators.js";
import { analyticsRouter } from "./analytics.js";
import { bodyMeasurementsRouter } from "./body-measurements.js";

export const privateRoutes = new Hono<Env>()
  .use("*", authMiddleware)
  .route("/api/v1/users", usersRouter)
  .route("/api/v1", exercisesRouter)
  .route("/api/v1/workouts", workoutsRouter)
  .route("/api/v1/workout-templates", workoutTemplatesRouter)
  .route("/api/v1/workouts", liveActivityRouter)
  .route("/api/v1/personal-records", personalRecordsRouter)
  .route("/api/v1/calculators", calculatorsRouter)
  .route("/api/v1/analytics", analyticsRouter)
  .route("/api/v1/body-measurements", bodyMeasurementsRouter);
