import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { createAuth } from "./lib/auth";
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

// Built-in Middleware for security & CORS
app.use("*", secureHeaders());
app.use("*", cors());

// Health check endpoints
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

// Mount Better Auth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return createAuth(c.env.DB).handler(c.req.raw);
});

// Mount API routes
const routes = app
  .route("/api/v1/auth", authRouter)
  .route("/api/v1/users", usersRouter)
  .route("/api/v1", exercisesRouter)
  .route("/api/v1/workouts", workoutsRouter)
  .route("/api/v1/workout-templates", workoutTemplatesRouter)
  .route("/api/v1/workouts", liveActivityRouter)
  .route("/api/v1/personal-records", personalRecordsRouter)
  .route("/api/v1/calculators", calculatorsRouter)
  .route("/api/v1/analytics", analyticsRouter)
  .route("/api/v1/body-measurements", bodyMeasurementsRouter);

// Global Not Found handler
app.notFound((c) => {
  return c.json({ error: "Endpoint not found" }, 404);
});

// Global Error handler
app.onError((err, c) => {
  console.error("Unhandled Application Error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
export type AppType = typeof routes;
