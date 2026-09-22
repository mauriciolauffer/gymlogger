import type { InferResponseType } from "hono/client";
import { client } from "./client";

// Intermediates for path segments that contain hyphens or colons (oxfmt can't parse bracket notation in typeof generics)
const workoutById = client.api.v1.workouts[":id"];
const muscleGroups = client.api.v1["muscle-groups"];
const workoutTemplates = client.api.v1["workout-templates"];
const templateById = client.api.v1["workout-templates"][":id"];
const bodyMeasurements = client.api.v1["body-measurements"];
const monthlyReport = client.api.v1.analytics["monthly-report"];
const setsPerMuscleGroup = client.api.v1.analytics["sets-per-muscle-group"];

// Workouts
export type WorkoutsGetRes = InferResponseType<typeof client.api.v1.workouts.$get, 200>;
export type WorkoutGetRes = InferResponseType<typeof workoutById.$get, 200>;

// Exercises (mounted at /api/v1, not /api/v1/exercises)
export type MuscleGroupsRes = InferResponseType<typeof muscleGroups.$get, 200>;
export type ExercisesRes = InferResponseType<typeof client.api.v1.exercises.$get, 200>;
export type ExercisePostRes = InferResponseType<typeof client.api.v1.exercises.$post, 201>;

// Workout Templates
export type TemplatesGetRes = InferResponseType<typeof workoutTemplates.$get, 200>;
export type TemplateGetRes = InferResponseType<typeof templateById.$get, 200>;

// Body Measurements
export type MeasurementsGetRes = InferResponseType<typeof bodyMeasurements.$get, 200>;

// Users
export type ProfileGetRes = InferResponseType<typeof client.api.v1.users.profile.$get, 200>;
export type SettingsGetRes = InferResponseType<typeof client.api.v1.users.settings.$get, 200>;
export type SettingsPutRes = InferResponseType<typeof client.api.v1.users.settings.$put, 200>;

// Analytics
export type MonthlyReportRes = InferResponseType<typeof monthlyReport.$get, 200>;
export type SetsPerMuscleGroupRes = InferResponseType<typeof setsPerMuscleGroup.$get, 200>;
export type ConsistencyRes = InferResponseType<
  typeof client.api.v1.analytics.consistency.$get,
  200
>;
export type PerformanceRes = InferResponseType<
  typeof client.api.v1.analytics.performance.$get,
  200
>;

// Calculators
export type WarmupRes = InferResponseType<typeof client.api.v1.calculators.warmup.$get, 200>;
