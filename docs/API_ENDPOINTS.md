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
- `GET /api/v1/users/settings` - Fetch current user's preferences (`theme`, `preferred_weight_unit`, `preferred_length_unit`, `language`).
- `PUT /api/v1/users/settings` - Update current user's preferences (`theme`, `preferred_weight_unit`, `preferred_length_unit`, `language`).

## Workouts API
- `POST /api/v1/workouts/start` - Start dynamic empty or routine-based workout.
- `POST /api/v1/workouts/:id/sets` - Add set with type, weight, weight_unit, reps, RPE. Calculates PRs live.
- `PUT /api/v1/workouts/:id/finish` - Finish workout, calculate final stats, volume, and duration.
- `GET /api/v1/workouts/previous-values?exerciseId=:id` - Fetch set values from previous workout for exercise.

## Calculators API
- `GET /api/v1/calculators/warmup?targetWeight=:w` - Return warm-up set breakdown based directly on total target weight.

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
