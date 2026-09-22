import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";
import {
  workouts,
  workoutExercises,
  workoutSets,
  workoutTemplates,
  workoutTemplateExercises,
  exercises,
  bodyMeasurements,
  userSettings,
  usersProfile,
} from "../db/schema.js";
import { SEX_VALUES, THEME_VALUES } from "../db/constants.js";

// ==========================================
// DERIVED FROM DRIZZLE TABLES
// ==========================================

const insertWorkoutSchema = createInsertSchema(workouts);
const insertWorkoutExerciseSchema = createInsertSchema(workoutExercises);
const insertWorkoutSetSchema = createInsertSchema(workoutSets);
const insertExerciseSchema = createInsertSchema(exercises);
const insertBodyMeasurementSchema = createInsertSchema(bodyMeasurements);
const insertWorkoutTemplateSchema = createInsertSchema(workoutTemplates);
const updateExerciseSchema = createUpdateSchema(exercises);
const updateBodyMeasurementSchema = createUpdateSchema(bodyMeasurements);
const updateWorkoutTemplateSchema = createUpdateSchema(workoutTemplates);
const updateProfileDrizzleSchema = createUpdateSchema(usersProfile);
const updateSettingsDrizzleSchema = createUpdateSchema(userSettings);

// ==========================================
// WORKOUTS
// ==========================================

export const startWorkoutSchema = z.object({
  title: insertWorkoutSchema.shape.title.optional(),
  start_time: z.iso.datetime({ offset: true }).optional(),
  template_id: z.string().optional(),
});

export const finishWorkoutSchema = z.object({
  notes: insertWorkoutSchema.shape.notes.optional(),
});

export const addWorkoutExerciseSchema = z.object({
  exercise_id: insertWorkoutExerciseSchema.shape.exerciseId,
  superset_id: insertWorkoutExerciseSchema.shape.supersetId.optional(),
  notes: insertWorkoutExerciseSchema.shape.notes.optional(),
  order_index: insertWorkoutExerciseSchema.shape.orderIndex.optional(),
});

export const addWorkoutSetSchema = z.object({
  workout_exercise_id: insertWorkoutSetSchema.shape.workoutExerciseId,
  set_type: insertWorkoutSetSchema.shape.setType.optional(),
  weight: z.number().min(0).optional(),
  weight_unit: insertWorkoutSetSchema.shape.weightUnit.optional(),
  reps: z.number().int().min(0).optional(),
  rpe: z.number().min(0).max(10).optional(),
  order_index: insertWorkoutSetSchema.shape.orderIndex.optional(),
});

export const updateWorkoutSetSchema = z.object({
  set_type: insertWorkoutSetSchema.shape.setType.optional(),
  weight: z.number().min(0).optional(),
  weight_unit: insertWorkoutSetSchema.shape.weightUnit.optional(),
  reps: z.number().int().min(0).optional(),
  rpe: z.number().min(0).max(10).optional(),
});

// ==========================================
// EXERCISES
// ==========================================

export const createExerciseSchema = z.object({
  name: insertExerciseSchema.shape.name,
  category: insertExerciseSchema.shape.category,
  body_part: insertExerciseSchema.shape.bodyPart.optional(),
  equipment: insertExerciseSchema.shape.equipment.optional(),
  instructions: insertExerciseSchema.shape.instructions.optional(),
  instruction_steps: z.array(z.string()).optional(),
  muscle_group_id: insertExerciseSchema.shape.muscleGroupId.optional(),
  target: insertExerciseSchema.shape.target.optional(),
  secondary_muscle_ids: z.array(z.string()).optional(),
});

export const updateExerciseBodySchema = z.object({
  name: updateExerciseSchema.shape.name,
  category: updateExerciseSchema.shape.category,
  body_part: updateExerciseSchema.shape.bodyPart,
  equipment: updateExerciseSchema.shape.equipment.optional(),
  instructions: updateExerciseSchema.shape.instructions.optional(),
  instruction_steps: z.array(z.string()).optional(),
  muscle_group_id: updateExerciseSchema.shape.muscleGroupId.optional(),
  target: updateExerciseSchema.shape.target.optional(),
  secondary_muscle_ids: z.array(z.string()).optional(),
});

// ==========================================
// BODY MEASUREMENTS
// ==========================================

const measurementField = z.number().min(0).nullable().optional();

export const createBodyMeasurementSchema = z.object({
  date: insertBodyMeasurementSchema.shape.date.optional(),
  weight: measurementField,
  weight_unit: insertBodyMeasurementSchema.shape.weightUnit.optional(),
  body_fat_pct: z.number().min(0).max(100).nullable().optional(),
  chest: measurementField,
  waist: measurementField,
  hips: measurementField,
  shoulders: measurementField,
  biceps: measurementField,
  forearms: measurementField,
  thighs: measurementField,
  calves: measurementField,
  neck: measurementField,
  length_unit: insertBodyMeasurementSchema.shape.lengthUnit.optional(),
});

export const updateBodyMeasurementBodySchema = z.object({
  date: updateBodyMeasurementSchema.shape.date,
  weight: measurementField,
  weight_unit: updateBodyMeasurementSchema.shape.weightUnit.optional(),
  body_fat_pct: z.number().min(0).max(100).nullable().optional(),
  chest: measurementField,
  waist: measurementField,
  hips: measurementField,
  shoulders: measurementField,
  biceps: measurementField,
  forearms: measurementField,
  thighs: measurementField,
  calves: measurementField,
  neck: measurementField,
  length_unit: updateBodyMeasurementSchema.shape.lengthUnit.optional(),
});

// ==========================================
// WORKOUT TEMPLATES
// ==========================================

const insertWorkoutTemplateExerciseSchema = createInsertSchema(workoutTemplateExercises);

const templateExerciseSchema = z.object({
  exercise_id: insertWorkoutTemplateExerciseSchema.shape.exerciseId,
  superset_id: insertWorkoutTemplateExerciseSchema.shape.supersetId.optional(),
  notes: insertWorkoutTemplateExerciseSchema.shape.notes.optional(),
  order_index: z.number().int().min(0).optional(),
});

export const createWorkoutTemplateSchema = z.object({
  title: insertWorkoutTemplateSchema.shape.title,
  notes: insertWorkoutTemplateSchema.shape.notes.optional(),
  exercises: z.array(templateExerciseSchema).optional(),
});

export const updateWorkoutTemplateBodySchema = z.object({
  title: updateWorkoutTemplateSchema.shape.title.optional(),
  notes: updateWorkoutTemplateSchema.shape.notes.optional(),
  exercises: z.array(templateExerciseSchema).optional(),
});

// ==========================================
// USERS
// ==========================================

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  location: updateProfileDrizzleSchema.shape.location,
  birthday: updateProfileDrizzleSchema.shape.birthday,
  sex: z.enum(SEX_VALUES).nullable().optional(),
  height: z.number().positive().nullable().optional(),
  height_unit: z.enum(["cm", "in"]).nullable().optional(),
  bio: updateProfileDrizzleSchema.shape.bio,
});

export const updateSettingsSchema = z.object({
  theme: z.enum(THEME_VALUES).optional(),
  preferred_weight_unit: z.enum(["kg", "lbs"]).optional(),
  preferred_length_unit: z.enum(["cm", "in"]).optional(),
  language: updateSettingsDrizzleSchema.shape.language,
  rest_timer_duration_seconds: z.number().int().positive().optional(),
  notifications_enabled: updateSettingsDrizzleSchema.shape.notificationsEnabled,
});
