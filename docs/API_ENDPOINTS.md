---
title: API Endpoints Specification
description: REST API route specifications for Authentication, Users, Settings, Exercises, Workouts, Calculators, Analytics, Personal Records, and Body Measurements using Hono on Cloudflare Workers.
tags:
  - api
  - endpoints
  - hono
  - cloudflare-workers
version: 1.2.0
relations:
  - type: defined_in
    target: PRD.md
  - type: queries
    target: DATABASE_SCHEMA.md
---

# GymLogger - API Endpoints Specification (Hono Router)

This document outlines the REST API endpoints supported by the Hono router running on Cloudflare Workers.

All endpoints except `/api/v1/auth/register` and `/api/v1/auth/login` require a valid authenticated session via a JWT `Authorization: Bearer <token>` header. Unauthenticated requests return `401`. Users may only access their own data; cross-user access returns `403`.

---

## Health Check

- `GET /` — Returns API name, status, and version.
- `GET /health` — Returns `{ status: "healthy" }`.

---

## Authentication API

- `POST /api/v1/auth/register` — Create a new user account. Body: `{ name?, email, password }`. Password must be at least 8 characters. Returns `{ message, token, user: { id, email, name } }` with HTTP 201.
- `POST /api/v1/auth/login` — Authenticate with `email` and `password`. Returns `{ message, token, user: { id, email, name } }`.
- `POST /api/v1/auth/logout` — Invalidate the current session. Requires authentication.

> **Note:** The app also exposes a Better Auth handler at `GET|POST /api/auth/*` for OAuth/social flows.

---

## Users & Settings API

- `GET /api/v1/users/profile` — Fetch current user's profile details (`id`, `email`, `name`, `location`, `birthday`, `sex`, `height`, `heightUnit`, `bio`, `createdAt`).
- `PUT /api/v1/users/profile` — Update current user's profile information. Body fields (all optional): `name`, `location`, `birthday`, `sex` (`male`|`female`|`other`|`prefer_not_to_say`), `height` (positive number), `height_unit` (`cm`|`in`), `bio`. Returns updated profile.
- `GET /api/v1/users/settings` — Fetch current user's preferences. Returns `{ settings: { theme, preferred_weight_unit, preferred_length_unit, language, rest_timer_duration_seconds, notifications_enabled, updated_at } }`. Creates default settings if none exist.
- `PUT /api/v1/users/settings` — Update current user's preferences. Body fields (all optional): `theme` (`light`|`dark`|`system`), `preferred_weight_unit` (`kg`|`lbs`), `preferred_length_unit` (`cm`|`in`), `language`, `rest_timer_duration_seconds` (positive integer), `notifications_enabled` (boolean). Returns updated settings.

---

## Muscle Groups API

- `GET /api/v1/muscle-groups` — List all muscle groups ordered by name. Returns `{ muscleGroups: [{ id, name }] }`. Used to populate filters in the exercise library and analytics views.

---

## Exercises API

- `GET /api/v1/exercises` — List/search the exercise library (up to 500 results, ordered by name). Returns global exercises plus the authenticated user's custom exercises. Supports query params: `?q=:name` (name search), `?category=:category`, `?bodyPart=:bodyPart`, `?equipment=:equipment`, `?target=:target`, `?muscleGroupId=:id`, `?custom=true` (user's custom exercises only).
- `GET /api/v1/exercises/:id` — Fetch a single exercise's full details including primary muscle group name and `secondaryMuscles` array.
- `POST /api/v1/exercises` — Create a custom user-defined exercise. Required: `name`, `category`, `body_part`. Optional: `equipment`, `instructions`, `instruction_steps` (array), `muscle_group_id`, `target`, `secondary_muscle_ids` (array of muscle group IDs). Returns HTTP 201.
- `PUT /api/v1/exercises/:id` — Update a custom exercise (only the owning user may update). Accepts the same fields as POST. Providing `secondary_muscle_ids` replaces all existing secondary muscles.
- `DELETE /api/v1/exercises/:id` — Delete a custom exercise (only the owning user may delete).

---

## Workout Templates API

- `GET /api/v1/workout-templates` — List the current user's saved workout templates, each including an `exercises` array with exercise name, category, and equipment. Ordered by `updatedAt` descending.
- `GET /api/v1/workout-templates/:id` — Fetch a single template with its exercises.
- `POST /api/v1/workout-templates` — Create a new workout template. Required: `title`. Optional: `notes`, `exercises: [{ exercise_id, order_index?, superset_id?, notes? }]`. Returns HTTP 201.
- `PUT /api/v1/workout-templates/:id` — Update a template's `title`, `notes`, or full `exercises` list. Providing `exercises` replaces the entire exercise list.
- `DELETE /api/v1/workout-templates/:id` — Delete a template (does not affect past sessions started from it).

---

## Workouts API

- `GET /api/v1/workouts` — List the current user's workout history ordered by `start_time` descending. Supports `?limit=` (1–100, default 20), `?offset=` (default 0), `?from=`, `?to=` date range filters.
- `GET /api/v1/workouts/:id` — Fetch a single workout with its exercises (including exercise name, category, equipment) and sets, ordered by `order_index`.
- `POST /api/v1/workouts/start` — Start a new workout session. Optional body: `{ title? (default "Workout"), start_time?, template_id? }`. If `template_id` is provided, pre-populates `workout_exercises` from the template. Returns the new workout record with HTTP 201.
- `GET /api/v1/workouts/previous-values?exerciseId=:id` — Fetch set values (`id`, `setType`, `weight`, `weightUnit`, `reps`, `rpe`, `orderIndex`) from the most recent prior session for a given exercise, plus `previousWorkoutDate`. Returns `{ sets: [], previousWorkoutDate: null }` if no prior session exists.
- `POST /api/v1/workouts/:id/exercises` — Add an exercise to an active workout session. Required: `exercise_id`. Optional: `superset_id`, `notes`, `order_index` (auto-incremented if omitted). Returns HTTP 201.
- `POST /api/v1/workouts/:id/sets` — Log a set on an exercise within an active workout. Required: `workout_exercise_id`. Optional: `set_type` (`normal`|`warmup`|`drop`|`failure`, default `normal`), `weight` (default 0), `weight_unit` (falls back to user preference), `reps` (default 0), `rpe`, `order_index`. Calculates and stores `estimated_1rm` using the Epley formula, detects PRs, and updates `total_volume` and `set_count`. Returns `{ set, isPr, prTypes }` with HTTP 201.
- `PUT /api/v1/workouts/:id/sets/:setId` — Update a previously logged set. Accepts `weight`, `reps`, `set_type`, `rpe`. Recalculates 1RM, re-runs PR detection, and updates workout totals. Returns `{ set, isPr, prTypes }`.
- `DELETE /api/v1/workouts/:id/sets/:setId` — Delete a logged set and update workout totals.
- `PUT /api/v1/workouts/:id/finish` — Finish the workout: sets `end_time`, calculates final `duration_seconds`, recalculates `total_volume` and `set_count`. Optional body: `{ notes? }`. Returns the finished workout.
- `DELETE /api/v1/workouts/:id` — Delete a workout and all associated exercises and sets (cascade).

---

## Live Activity API

- `GET /api/v1/workouts/:id/live` — Returns current workout session state as JSON: `{ workoutId, status ("active"|"completed"), elapsedSeconds, restTimerDurationSeconds, lastSet }`. `lastSet` is the most recently logged set for the workout, or `null`.

---

## Calculators API

- `GET /api/v1/calculators/warmup?targetWeight=:w` — Return a warm-up set breakdown. `targetWeight` must be a positive number. Returns `{ targetWeight, warmUpSets: [{ percent, weight, reps, set_type, notes }] }` with three sets at 40%×10 reps, 60%×6 reps, and 80%×3 reps.

---

## Personal Records API

- `GET /api/v1/personal-records` — List all-time PRs for the current user across all exercises (up to 500, ordered by `achievedAt` descending). Each record includes `id`, `userId`, `exerciseId`, `prType` (`1rm`|`weight`|`volume`|`reps`), `value`, `valueUnit`, `achievedAt`, `workoutSetId`, and `exerciseName`.
- `GET /api/v1/personal-records?exerciseId=:id` — Scope PR list to a single exercise.

---

## Analytics & Progress API

- `GET /api/v1/analytics/performance?exerciseId=:id` — Retrieve per-exercise progression data. `exerciseId` is required. Returns `{ exercise, oneRepMaxCurve, maxWeightCurve, maxRepsCurve, history }` where each curve is an array of `{ date, value, ... }` objects and `history` contains all sessions with raw sets.
- `GET /api/v1/analytics/monthly-report?year=:year&month=:month` — Monthly aggregated metrics. `year` and `month` default to the current month. Returns `{ period, totalWorkouts, totalVolume, totalDurationSeconds, topPRs (top 5), muscleDistribution }`.
- `GET /api/v1/analytics/muscle-distribution?from=:date&to=:date` — Muscle group set count and percentage split for a selectable date range. Returns `{ totalSets, distribution: [{ muscleGroupId, muscleGroup, setCount, percentage }] }`.
- `GET /api/v1/analytics/sets-per-muscle-group?from=:date&to=:date` — Sets per muscle group with fixed hypertrophy target range annotations (min 10, max 20). Returns `{ setsPerMuscleGroup: [{ muscleGroupId, muscleGroup, setCount, hypertrophyTargetMin, hypertrophyTargetMax }] }`.
- `GET /api/v1/analytics/consistency` — Workout streak count and activity calendar data. Returns `{ currentStreakDays, totalWorkouts, activeDates }` where `activeDates` is an array of ISO date strings (deduplicated, sorted descending).
- `GET /api/v1/analytics/year-in-review?year=:year` — Annual workout analytics summary. `year` defaults to the current year. Returns `{ year, totalWorkouts, totalVolume, totalDurationSeconds, topPRs (top 10) }`.

---

## Body Measurements API

- `GET /api/v1/body-measurements` — Fetch historical body measurement logs in chronological order. Supports `?from=:date` and `?to=:date` filters. All values are automatically converted to the user's preferred units (`preferred_weight_unit`, `preferred_length_unit`).
- `POST /api/v1/body-measurements` — Record a new measurement log. Optional body fields: `date` (ISO date, defaults to today), `weight`, `weight_unit`, `body_fat_pct`, `chest`, `waist`, `hips`, `shoulders`, `biceps`, `forearms`, `thighs`, `calves`, `neck`, `length_unit`. Units default to user preferences. Returns HTTP 201.
- `GET /api/v1/body-measurements/:id` — Fetch a single measurement log entry (raw, no unit conversion).
- `PUT /api/v1/body-measurements/:id` — Update a measurement log entry. Accepts any subset of the POST fields.
- `DELETE /api/v1/body-measurements/:id` — Delete a measurement log entry.
