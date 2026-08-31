---
title: API Endpoints Specification
description: REST API route specifications for Authentication, Users, Settings, Exercises, Workouts, Calculators, Analytics, Personal Records, and Body Measurements using Hono on Cloudflare Workers.
tags:
  - api
  - endpoints
  - hono
  - cloudflare-workers
version: 1.1.0
relations:
  - type: defined_in
    target: PRD.md
  - type: queries
    target: DATABASE_SCHEMA.md
---

# GymLogger - API Endpoints Specification (Hono Router)

This document outlines the REST API endpoints supported by the Hono router running on Cloudflare Workers.

All endpoints except `/api/v1/auth/register` and `/api/v1/auth/login` require a valid authenticated session. Unauthenticated requests return `401`. Users may only access their own data; cross-user access returns `403`.

---

## Authentication API

- `POST /api/v1/auth/register` — Create a new user account (`email`, `password`). Returns the created user profile and session token.
- `POST /api/v1/auth/login` — Authenticate with `email` and `password`. Returns a session token.
- `POST /api/v1/auth/logout` — Invalidate the current session token.

---

## Users & Settings API

- `GET /api/v1/users/profile` — Fetch current user's profile details (`email`, `name`, `location`, `birthday`, `sex`, `bio`).
- `PUT /api/v1/users/profile` — Update current user's profile information (`name`, `location`, `birthday`, `sex`, `bio`).
- `GET /api/v1/users/settings` — Fetch current user's preferences (`theme`, `preferred_weight_unit`, `preferred_length_unit`, `language`, `rest_timer_duration_seconds`).
- `PUT /api/v1/users/settings` — Update current user's preferences (`theme`, `preferred_weight_unit`, `preferred_length_unit`, `language`, `rest_timer_duration_seconds`).

---

## Muscle Groups API

- `GET /api/v1/muscle-groups` — List all muscle groups (id, name). Used to populate filters in the exercise library and analytics views.

---

## Exercises API

- `GET /api/v1/exercises` — List/search the exercise library. Supports query params: `?q=:name`, `?category=:category`, `?bodyPart=:bodyPart`, `?equipment=:equipment`, `?target=:target`, `?muscleGroupId=:id`, `?custom=true` (user's custom exercises only).
- `GET /api/v1/exercises/:id` — Fetch a single exercise's full details including primary muscle group and secondary muscles.
- `POST /api/v1/exercises` — Create a custom user-defined exercise. Accepts all exercise fields; `muscle_group_id` references `muscle_groups`; `secondary_muscle_ids[]` populates `exercise_secondary_muscles`.
- `PUT /api/v1/exercises/:id` — Update a custom exercise (only the owning user may update). Replaces secondary muscles when `secondary_muscle_ids[]` is provided.
- `DELETE /api/v1/exercises/:id` — Delete a custom exercise (only the owning user may delete).

---

## Workout Templates API

- `GET /api/v1/workout-templates` — List the current user's saved workout templates.
- `GET /api/v1/workout-templates/:id` — Fetch a single template with its exercises.
- `POST /api/v1/workout-templates` — Create a new workout template. Body: `{ title, notes?, exercises: [{ exercise_id, order_index, superset_id?, notes? }] }`.
- `PUT /api/v1/workout-templates/:id` — Update a template's title, notes, or exercise list.
- `DELETE /api/v1/workout-templates/:id` — Delete a template (does not affect past sessions started from it).

---

## Workouts API

- `GET /api/v1/workouts` — List the current user's workout history. Supports `?limit=`, `?offset=`, `?from=`, `?to=` date range filters.
- `GET /api/v1/workouts/:id` — Fetch a single workout with its exercises and sets.
- `POST /api/v1/workouts/start` — Start a new empty workout session. Returns the new workout record with `start_time`.
- `POST /api/v1/workouts/:id/exercises` — Add an exercise to an active workout session. Body: `{ exercise_id, superset_id?, notes?, order_index }`.
- `POST /api/v1/workouts/:id/sets` — Log a set on an exercise within an active workout. Body: `{ workout_exercise_id, set_type, weight, weight_unit, reps, rpe? }`. Calculates and stores `estimated_1rm`, detects PRs, and updates running `total_volume` and `set_count`.
- `PUT /api/v1/workouts/:id/sets/:setId` — Update a previously logged set (correct weight, reps, or type mid-workout).
- `DELETE /api/v1/workouts/:id/sets/:setId` — Delete a logged set.
- `PUT /api/v1/workouts/:id/finish` — Finish the workout: sets `end_time`, calculates final `duration_seconds`, `total_volume`, `set_count`, and `has_pr`.
- `DELETE /api/v1/workouts/:id` — Delete a workout and all associated exercises and sets.
- `GET /api/v1/workouts/previous-values?exerciseId=:id` — Fetch set values from the most recent prior session for a given exercise (used to pre-populate reference values during logging).

---

## Live Activity API

- `GET /api/v1/workouts/:id/live` — Server-Sent Events (SSE) stream for an active workout session. Emits elapsed session duration ticks and rest timer countdown events. Falls back to polling if SSE is unsupported.

---

## Calculators API

- `GET /api/v1/calculators/warmup?targetWeight=:w` — Return a warm-up set breakdown (e.g., 40%/60%/80% of `targetWeight`) based on the total target working weight.

---

## Personal Records API

- `GET /api/v1/personal-records` — List all-time PRs for the current user across all exercises. Each record includes `exercise_id`, `pr_type` (`1rm`, `weight`, `volume`, `reps`), `value`, `value_unit`, and `achieved_at`.
- `GET /api/v1/personal-records?exerciseId=:id` — Scope PR list to a single exercise.

---

## Analytics & Progress API

- `GET /api/v1/analytics/performance?exerciseId=:id` — Retrieve per-exercise 1RM progression curve, max weight curve, and max reps curve over time. `exerciseId` is required.
- `GET /api/v1/analytics/monthly-report?year=:year&month=:month` — Monthly aggregated metrics: total workouts, total volume, total duration, top PRs set that month, most frequently trained muscle groups, and weekly sets per muscle group versus hypertrophy target ranges.
- `GET /api/v1/analytics/muscle-distribution?from=:date&to=:date` — Muscle group set count and percentage split for a selectable date range.
- `GET /api/v1/analytics/sets-per-muscle-group?from=:date&to=:date` — Weekly sets per muscle group with hypertrophy target range annotations.
- `GET /api/v1/analytics/consistency` — Workout streak count and activity data for a weekly calendar heatmap.
- `GET /api/v1/analytics/year-in-review?year=:year` — Annual workout analytics summary dashboard data.

---

## Body Measurements API

- `GET /api/v1/body-measurements` — Fetch historical body measurement logs in chronological order.
- `POST /api/v1/body-measurements` — Record a new measurement log (weight, body fat %, and any circumference metrics with decoupled units).
- `GET /api/v1/body-measurements/:id` — Fetch a single measurement log entry.
- `PUT /api/v1/body-measurements/:id` — Update a measurement log entry.
- `DELETE /api/v1/body-measurements/:id` — Delete a measurement log entry.
