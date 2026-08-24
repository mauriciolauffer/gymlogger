# GymLogger - API Endpoints Specification (Hono Router)

This document outlines the REST API endpoints supported by the Hono router running on Cloudflare Workers.

## Workouts API
- `POST /api/v1/workouts/start` - Start dynamic empty or routine-based workout.
- `POST /api/v1/workouts/:id/sets` - Add set with type, weight, reps, RPE. Calculates PRs live.
- `PUT /api/v1/workouts/:id/finish` - Finish workout, calculate final stats, volume, and duration.
- `GET /api/v1/workouts/previous-values?exerciseId=:id` - Fetch set values from previous workout for exercise.

## Calculators API
- `GET /api/v1/calculators/warmup?targetWeight=:w` - Return warm-up set breakdown.
- `GET /api/v1/calculators/plates?targetWeight=:w&barWeight=:b` - Return plate breakdown per side.

## Analytics & Progress API
- `GET /api/v1/analytics/performance` - Retrieve 1RM, volume, and rep trends.
- `GET /api/v1/analytics/monthly-report` - Monthly aggregated metrics summary.
- `GET /api/v1/analytics/muscle-distribution` - Muscle group set count and percentage split.
- `GET /api/v1/analytics/sets-per-muscle-group` - Weekly sets per muscle group.
- `GET /api/v1/analytics/consistency` - Streak count and activity heatmap.
- `GET /api/v1/analytics/year-in-review?year=:year` - Annual workout analytics.

## Body Measurements API
- `POST /api/v1/body-measurements` - Record measurement log.
- `GET /api/v1/body-measurements` - Fetch historical body metrics.
