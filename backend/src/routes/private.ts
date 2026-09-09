import { Hono } from "hono";
import type { Env } from "../index";
import { authMiddleware } from "../middleware/auth";
import { usersRouter } from "./users";
import { exercisesRouter } from "./exercises";
import { workoutsRouter } from "./workouts";
import { workoutTemplatesRouter } from "./workout-templates";
import { liveActivityRouter } from "./live-activity";
import { personalRecordsRouter } from "./personal-records";
import { calculatorsRouter } from "./calculators";
import { analyticsRouter } from "./analytics";
import { bodyMeasurementsRouter } from "./body-measurements";

const privateRoutes = new Hono<Env>();

privateRoutes.use("*", authMiddleware);

privateRoutes
  .route("/api/v1/users", usersRouter)
  .route("/api/v1", exercisesRouter)
  .route("/api/v1/workouts", workoutsRouter)
  .route("/api/v1/workout-templates", workoutTemplatesRouter)
  .route("/api/v1/workouts", liveActivityRouter)
  .route("/api/v1/personal-records", personalRecordsRouter)
  .route("/api/v1/calculators", calculatorsRouter)
  .route("/api/v1/analytics", analyticsRouter)
  .route("/api/v1/body-measurements", bodyMeasurementsRouter);

export { privateRoutes };
