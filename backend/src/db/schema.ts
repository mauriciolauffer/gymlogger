import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";

// ==========================================
// BETTER AUTH TABLES (SQLite)
// ==========================================

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// ==========================================
// GYMLOGGER DOMAIN TABLES
// ==========================================

export const units = sqliteTable("units", {
  code: text("code").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
});

export const usersProfile = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  location: text("location"),
  birthday: text("birthday"),
  sex: text("sex"),
  height: real("height"),
  heightUnit: text("height_unit").default("cm"),
  bio: text("bio"),
  createdAt: text("created_at"),
});

export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id").primaryKey(),
  theme: text("theme").default("system"),
  preferredWeightUnit: text("preferred_weight_unit").default("kg"),
  preferredLengthUnit: text("preferred_length_unit").default("cm"),
  language: text("language").default("en"),
  restTimerDurationSeconds: integer("rest_timer_duration_seconds").default(90),
  notificationsEnabled: integer("notifications_enabled", { mode: "boolean" }).default(true),
  updatedAt: text("updated_at"),
});

export const muscleGroups = sqliteTable("muscle_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const exercises = sqliteTable("exercises", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  bodyPart: text("body_part").notNull(),
  equipment: text("equipment"),
  instructions: text("instructions"),
  instructionSteps: text("instruction_steps"),
  muscleGroupId: text("muscle_group_id"),
  target: text("target"),
  mediaId: text("media_id"),
  image: text("image"),
  gifUrl: text("gif_url"),
  attribution: text("attribution"),
  isCustom: integer("is_custom", { mode: "boolean" }).default(false),
  userId: text("user_id"),
  createdAt: text("created_at"),
});

export const exerciseSecondaryMuscles = sqliteTable(
  "exercise_secondary_muscles",
  {
    exerciseId: text("exercise_id").notNull(),
    muscleGroupId: text("muscle_group_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.exerciseId, table.muscleGroupId] })],
);

export const workoutTemplates = sqliteTable("workout_templates", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const workoutTemplateExercises = sqliteTable("workout_template_exercises", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull(),
  exerciseId: text("exercise_id").notNull(),
  supersetId: text("superset_id"),
  notes: text("notes"),
  orderIndex: integer("order_index").notNull(),
});

export const workouts = sqliteTable("workouts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  templateId: text("template_id"),
  title: text("title").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  durationSeconds: integer("duration_seconds"),
  totalVolume: real("total_volume").default(0),
  volumeUnit: text("volume_unit").default("kg"),
  setCount: integer("set_count").default(0),
  hasPr: integer("has_pr", { mode: "boolean" }).default(false),
  notes: text("notes"),
  createdAt: text("created_at"),
});

export const workoutExercises = sqliteTable("workout_exercises", {
  id: text("id").primaryKey(),
  workoutId: text("workout_id").notNull(),
  exerciseId: text("exercise_id").notNull(),
  supersetId: text("superset_id"),
  notes: text("notes"),
  orderIndex: integer("order_index").notNull(),
});

export const workoutSets = sqliteTable("workout_sets", {
  id: text("id").primaryKey(),
  workoutExerciseId: text("workout_exercise_id").notNull(),
  setType: text("set_type").default("normal"),
  weight: real("weight").notNull().default(0),
  weightUnit: text("weight_unit").default("kg"),
  reps: integer("reps").notNull().default(0),
  rpe: real("rpe"),
  estimated1rm: real("estimated_1rm"),
  estimated1rmFormula: text("estimated_1rm_formula"),
  isPr: integer("is_pr", { mode: "boolean" }).default(false),
  prType: text("pr_type"),
  orderIndex: integer("order_index").notNull(),
});

export const personalRecords = sqliteTable("personal_records", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  exerciseId: text("exercise_id").notNull(),
  prType: text("pr_type").notNull(),
  value: real("value").notNull(),
  valueUnit: text("value_unit"),
  achievedAt: text("achieved_at").notNull(),
  workoutSetId: text("workout_set_id"),
});

export const bodyMeasurements = sqliteTable("body_measurements", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  weight: real("weight"),
  weightUnit: text("weight_unit").default("kg"),
  bodyFatPct: real("body_fat_pct"),
  chest: real("chest"),
  waist: real("waist"),
  hips: real("hips"),
  shoulders: real("shoulders"),
  biceps: real("biceps"),
  forearms: real("forearms"),
  thighs: real("thighs"),
  calves: real("calves"),
  neck: real("neck"),
  lengthUnit: text("length_unit").default("cm"),
  photoUrl: text("photo_url"),
  createdAt: text("created_at"),
});
