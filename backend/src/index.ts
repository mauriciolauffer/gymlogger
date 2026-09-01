import { Hono } from "hono";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { exercisesRouter } from "./routes/exercises";
import { workoutsRouter } from "./routes/workouts";
import { workoutTemplatesRouter } from "./routes/workout-templates";
import { personalRecordsRouter } from "./routes/personal-records";
import { calculatorsRouter } from "./routes/calculators";
import { liveActivityRouter } from "./routes/live-activity";
import { analyticsRouter } from "./routes/analytics";
import { bodyMeasurementsRouter } from "./routes/body-measurements";

export type Env = {
  Bindings: {
    DB: D1Database;
  };
  Variables: {
    user?: { userId: string; email: string };
  };
};

const app = new Hono<Env>();

app.get("/", (c) => {
  return c.json({
    name: "GymLogger API",
    status: "ok",
    version: "0.1.0",
  });
});

app.get("/health", (c) => {
  return c.json({ status: "healthy" });
});

app.route("/api/v1/auth", authRouter);
app.route("/api/v1/users", usersRouter);
app.route("/api/v1", exercisesRouter);
app.route("/api/v1/workouts", workoutsRouter);
app.route("/api/v1/workout-templates", workoutTemplatesRouter);
app.route("/api/v1/workouts", liveActivityRouter);
app.route("/api/v1/personal-records", personalRecordsRouter);
app.route("/api/v1/calculators", calculatorsRouter);
app.route("/api/v1/analytics", analyticsRouter);
app.route("/api/v1/body-measurements", bodyMeasurementsRouter);

export default app;
