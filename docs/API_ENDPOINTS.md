---
title: API Endpoints Specification
description: REST API route specifications for Users, Settings, Workouts, Calculators, Analytics, and Body Measurements using Hono on Cloudflare Workers.
tags:
  - api
  - endpoints
  - hono
  - cloudflare-workers
version: 1.0.0
relations:
  - type: defined_in
    target: PRD.md
  - type: queries
    target: DATABASE_SCHEMA.md
---

# GymLogger - API Endpoints Specification (Hono Router)

This document outlines the REST API endpoints supported by the Hono router running on Cloudflare Workers.

## Users & Settings API
- `GET /api/v1/users/profile` - Fetch current user's profile details (`email`, `name`, `location`, `birthday`, `sex`, `bio`).
- `PUT /api/v1/users/profile` - Update current user's profile information (`name`, `location`, `birthday`, `sex`, `bio`).
- `GET /api/v1/users/settings` - Fetch current user's preferences (`theme`, `preferred_weight_unit`, `preferred_length_unit`, `language`, `default_rest_timer_seconds`).
- `PUT /api/v1/users/settings` - Update current user's preferences (`theme`, `preferred_weight_unit`, `preferred_length_unit`, `language`, `default_rest_timer_seconds`).

## Exercises API
- `GET /api/v1/exercises` - List global and custom exercises (supports search, category, and muscle group filtering).
- `POST /api/v1/exercises` - Create a custom exercise (`name`, `category`, `primary_muscle_group`, `secondary_muscle_groups`).
- `GET /api/v1/exercises/:id` - Fetch exercise details by ID.
- `PUT /api/v1/exercises/:id` - Update a custom exercise details.
- `DELETE /api/v1/exercises/:id` - Delete a custom exercise.

## Workouts API
- `POST /api/v1/workouts/start` - Start dynamic empty or routine-based workout.
- `GET /api/v1/workouts` - Fetch paginated list of user's past workouts.
- `GET /api/v1/workouts/live-activity` - Fetch active live session state (rest timer status, elapsed session duration).
- `GET /api/v1/workouts/previous-values?exerciseId=:id` - Fetch set values from previous workout for exercise.
- `GET /api/v1/workouts/:id` - Fetch workout session details including exercises and sets.
- `POST /api/v1/workouts/:id/exercises` - Add an exercise (or superset group) to an active workout session.
- `DELETE /api/v1/workouts/:id/exercises/:workoutExerciseId` - Remove an exercise from an active workout session.
- `POST /api/v1/workouts/:id/sets` - Add set with type, weight, weight_unit, reps, RPE, superset grouping. Calculates PRs live.
- `PUT /api/v1/workouts/:id/sets/:setId` - Update set details (weight, reps, set type, RPE).
- `DELETE /api/v1/workouts/:id/sets/:setId` - Delete set from workout exercise.
- `PUT /api/v1/workouts/:id/finish` - Finish workout, calculate final stats, volume, and duration.
- `DELETE /api/v1/workouts/:id` - Delete a workout log.

## Calculators API
- `GET /api/v1/calculators/warmup?targetWeight=:w` - Return warm-up set breakdown based directly on total target weight.

## Analytics & Progress API
- `GET /api/v1/analytics/performance?exerciseId=:id` - Retrieve 1RM curve, weight progression curve, max reps curve, and session history for exercise drill-down.
- `GET /api/v1/analytics/monthly-report` - Monthly aggregated metrics summary (workouts, volume, duration, PRs, top muscles, weekly sets vs targets).
- `GET /api/v1/analytics/muscle-distribution` - Muscle group set count and percentage split across selectable date ranges.
- `GET /api/v1/analytics/sets-per-muscle-group` - Weekly sets per muscle group versus hypertrophy target ranges.
- `GET /api/v1/analytics/consistency` - Streak count and activity heatmap calendar.
- `GET /api/v1/analytics/year-in-review?year=:year` - Annual workout analytics.

## Body Measurements API
- `POST /api/v1/body-measurements` - Record measurement log (10 body metrics: weight, body fat %, chest, waist, biceps, thighs, neck, shoulders, hips, calves; decoupled length/weight units; optional photo attachment).
- `GET /api/v1/body-measurements` - Fetch historical body metrics and progress photo logs.
- `GET /api/v1/body-measurements/:id` - Fetch single body measurement log details.
- `DELETE /api/v1/body-measurements/:id` - Delete body measurement log.
