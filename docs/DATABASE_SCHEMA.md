---
title: Database Schema Specification
description: Cloudflare D1 (SQLite) relational database schema for users, workouts, exercises, sets, and body measurements.
tags:
  - database
  - schema
  - d1
  - sqlite
version: 1.0.0
relations:
  - type: defined_in
    target: PRD.md
  - type: implemented_by
    target: API_ENDPOINTS.md
---

# GymLogger - Database Schema Specification (Cloudflare D1)

This document defines the relational database schema for GymLogger running on Cloudflare D1 (serverless SQLite).

## Entity Relationship Overview

```
 [users] 1 ─────────── N [workouts]
                           │ 1
                           │
                           ▼ N
 [exercises] 1 ─────── N [workout_exercises]
                           │ 1
                           │
                           ▼ N
                         [workout_sets]
```

- **`exercises`**: Exercise library containing preset and custom exercises.
- **`workouts`**: Parent record for an athlete's workout session.
- **`workout_exercises`**: Junction table mapping an exercise from the library into a specific workout (`1 Workout` -> `N Workout Exercises`).
- **`workout_sets`**: Individual set entries for an exercise within a workout (`1 Workout Exercise` -> `N Workout Sets`).

---

## Schema Definition (SQL)

```sql
-- Users Table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Body Measurements Table (Decoupled Values and Units)
CREATE TABLE body_measurements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    weight REAL,
    weight_unit TEXT CHECK(weight_unit IN ('kg', 'lbs')) DEFAULT 'kg',
    body_fat_pct REAL,
    length_unit TEXT CHECK(length_unit IN ('cm', 'in')) DEFAULT 'cm',
    chest REAL,
    waist REAL,
    biceps REAL,
    thighs REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Exercises Library Table
CREATE TABLE exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- Barbell, Dumbbell, Machine, Cable, Bodyweight, etc.
    primary_muscle_group TEXT NOT NULL, -- Chest, Back, Legs, Shoulders, Arms, Core
    secondary_muscle_groups TEXT, -- JSON Array
    is_custom BOOLEAN DEFAULT FALSE,
    user_id TEXT REFERENCES users(id)
);

-- Workouts Table (1 Workout -> N workout_exercises)
CREATE TABLE workouts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_seconds INTEGER,
    total_volume REAL DEFAULT 0,
    volume_unit TEXT CHECK(volume_unit IN ('kg', 'lbs')) DEFAULT 'kg',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Workout Exercises Table (1 Exercise in a workout -> N workout_sets)
CREATE TABLE workout_exercises (
    id TEXT PRIMARY KEY,
    workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    superset_id TEXT, -- Null if not in a superset
    notes TEXT,
    order_index INTEGER NOT NULL
);

-- Workout Sets Table (1 Set record belonging to a workout_exercise)
CREATE TABLE workout_sets (
    id TEXT PRIMARY KEY,
    workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_type TEXT CHECK(set_type IN ('normal', 'warmup', 'drop', 'failure')) DEFAULT 'normal',
    weight REAL NOT NULL DEFAULT 0,
    weight_unit TEXT CHECK(weight_unit IN ('kg', 'lbs')) DEFAULT 'kg',
    reps INTEGER NOT NULL DEFAULT 0,
    rpe REAL,
    is_pr BOOLEAN DEFAULT FALSE,
    pr_type TEXT, -- '1rm', 'weight', 'volume', 'reps'
    order_index INTEGER NOT NULL
);
```
