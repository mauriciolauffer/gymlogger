---
title: Database Schema Specification
description: Cloudflare D1 (SQLite) relational database schema for users, user settings, workouts, exercises, sets, body measurements, and units of measurement.
tags:
  - database
  - schema
  - d1
  - sqlite
version: 1.1.0
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
 [units]
   │ 1
   ├─────────────── N [user_settings]
   ├─────────────── N [body_measurements]
   └─────────────── N [workout_sets]
                        └─── N [workouts]

 [users] 1 ─────────── 1 [user_settings]
   │ 1
   ├─────────── N [workout_templates]
   │                │ 1
   │                ▼ N
   │            [workout_template_exercises]
   │
   ├─────────── N [workouts]
   │                │ 1 (template_id optional FK)
   │                ▼ N
   │            [workout_exercises]
   │                │ 1
   │                ▼ N
   │            [workout_sets]
   │
   ├─────────── N [exercises] (custom)
   ├─────────── N [body_measurements]
   └─────────── N [personal_records]

 [muscle_groups] 1 ── N [exercises] (primary)
 [muscle_groups] N ── N [exercises] (secondary, via exercise_secondary_muscles)
```

- **`units`**: Central lookup table defining supported units of measurement (e.g., `kg`, `lbs`, `cm`, `in`, `km`, `m`).
- **`users`**: User profile table storing authentication and personal profile details.
- **`user_settings`**: User preferences table storing theme, preferred units, language, and rest timer duration.
- **`muscle_groups`**: Lookup table of muscle group names (e.g., Biceps, Pectoralis Major, Quadriceps).
- **`exercises`**: Exercise library containing preset and custom exercises. `muscle_group_id` references the primary muscle group; secondary muscles use the `exercise_secondary_muscles` join table.
- **`exercise_secondary_muscles`**: Many-to-many join table linking exercises to their secondary muscle groups.
- **`workout_templates`**: Saved reusable workout structures owned by a user.
- **`workout_template_exercises`**: Ordered exercise list within a template.
- **`workouts`**: Parent record for an athlete's workout session. `template_id` optionally references the template it was started from.
- **`workout_exercises`**: Junction table mapping an exercise from the library into a specific workout.
- **`workout_sets`**: Individual set entries for an exercise within a workout, including stored 1RM and formula.
- **`personal_records`**: Materialized cache of all-time PR values per user/exercise/type for fast live detection.
- **`body_measurements`**: Logged body metrics per user per date.

---

## Schema Definition (SQL)

```sql
-- Units of Measurement Central Lookup Table
CREATE TABLE units (
    code TEXT PRIMARY KEY, -- 'kg', 'lbs', 'cm', 'in', 'km', 'm'
    type TEXT NOT NULL CHECK(type IN ('weight', 'length')),
    name TEXT NOT NULL,
    symbol TEXT NOT NULL
);

-- Seed Default Units
INSERT INTO units (code, type, name, symbol) VALUES
('kg', 'weight', 'Kilograms', 'kg'),
('lbs', 'weight', 'Pounds', 'lbs'),
('cm', 'length', 'Centimeters', 'cm'),
('in', 'length', 'Inches', 'in'),
('km', 'length', 'Kilometers', 'km'),
('m', 'length', 'Meters', 'm');

-- Users Profile Table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    location TEXT,
    birthday DATE,
    sex TEXT CHECK(sex IN ('male', 'female', 'other', 'prefer_not_to_say')),
    height REAL,
    height_unit TEXT REFERENCES units(code) DEFAULT 'cm',
    bio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Settings Table
CREATE TABLE user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT CHECK(theme IN ('light', 'dark', 'system')) DEFAULT 'system',
    preferred_weight_unit TEXT REFERENCES units(code) DEFAULT 'kg',
    preferred_length_unit TEXT REFERENCES units(code) DEFAULT 'cm',
    language TEXT DEFAULT 'en',
    rest_timer_duration_seconds INTEGER DEFAULT 90,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Body Measurements Table (10 metrics + progress photo)
CREATE TABLE body_measurements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    weight REAL,
    weight_unit TEXT REFERENCES units(code) DEFAULT 'kg',
    body_fat_pct REAL,
    chest REAL,
    waist REAL,
    hips REAL,
    shoulders REAL,
    biceps REAL,
    forearms REAL,
    thighs REAL,
    calves REAL,
    neck REAL,
    length_unit TEXT REFERENCES units(code) DEFAULT 'cm',
    photo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Muscle Groups Lookup Table
CREATE TABLE muscle_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE -- e.g. 'Biceps', 'Pectoralis Major', 'Quadriceps'
);

-- Exercises Library Table
CREATE TABLE exercises (
    id TEXT PRIMARY KEY,                  -- Unique numeric string, e.g. '0001'
    name TEXT NOT NULL,
    category TEXT NOT NULL,              -- Body part category, e.g. 'upper arms', 'chest', 'back'
    body_part TEXT NOT NULL,             -- Same as category — body part targeted
    equipment TEXT,                      -- Required equipment, e.g. 'dumbbell', 'body weight'
    instructions TEXT,                   -- Full step-by-step instructions in English
    instruction_steps TEXT,              -- JSON array of ordered instruction steps
    muscle_group_id TEXT REFERENCES muscle_groups(id),  -- Primary synergist muscle group
    target TEXT,                         -- Primary target muscle, e.g. 'biceps', 'pectoralis major'
    media_id TEXT,                       -- Original media reference id, e.g. '2gPfomN'
    image TEXT,                          -- Path to 180×180 thumbnail, e.g. 'images/0001-2gPfomN.jpg'
    gif_url TEXT,                        -- Path to 180×180 animation GIF, e.g. 'videos/0001-2gPfomN.gif'
    attribution TEXT,                    -- Media copyright notice
    is_custom BOOLEAN DEFAULT FALSE,
    user_id TEXT REFERENCES users(id),   -- NULL for global exercises; set for custom
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Exercise Secondary Muscles Join Table (many-to-many)
CREATE TABLE exercise_secondary_muscles (
    exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    muscle_group_id TEXT NOT NULL REFERENCES muscle_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (exercise_id, muscle_group_id)
);

-- Workout Templates Table
CREATE TABLE workout_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Workout Template Exercises Table
CREATE TABLE workout_template_exercises (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    superset_id TEXT,
    notes TEXT,
    order_index INTEGER NOT NULL
);

-- Workouts Table (1 Workout -> N workout_exercises)
CREATE TABLE workouts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    template_id TEXT REFERENCES workout_templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_seconds INTEGER,
    total_volume REAL DEFAULT 0,
    volume_unit TEXT REFERENCES units(code) DEFAULT 'kg',
    set_count INTEGER DEFAULT 0,
    has_pr BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Workout Exercises Table (1 Exercise in a workout -> N workout_sets)
CREATE TABLE workout_exercises (
    id TEXT PRIMARY KEY,
    workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    superset_id TEXT, -- Shared identifier grouping 2–3 exercises into a superset/tri-set
    notes TEXT,
    order_index INTEGER NOT NULL
);

-- Workout Sets Table (1 Set record belonging to a workout_exercise)
CREATE TABLE workout_sets (
    id TEXT PRIMARY KEY,
    workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_type TEXT CHECK(set_type IN ('normal', 'warmup', 'drop', 'failure')) DEFAULT 'normal',
    weight REAL NOT NULL DEFAULT 0,
    weight_unit TEXT REFERENCES units(code) DEFAULT 'kg',
    reps INTEGER NOT NULL DEFAULT 0,
    rpe REAL,
    estimated_1rm REAL,
    estimated_1rm_formula TEXT CHECK(estimated_1rm_formula IN ('epley', 'brzycki')),
    is_pr BOOLEAN DEFAULT FALSE,
    pr_type TEXT, -- '1rm', 'weight', 'volume', 'reps'
    order_index INTEGER NOT NULL
);

-- Personal Records Cache Table (materialized for fast live PR detection)
CREATE TABLE personal_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    pr_type TEXT NOT NULL CHECK(pr_type IN ('1rm', 'weight', 'volume', 'reps')),
    value REAL NOT NULL,
    value_unit TEXT REFERENCES units(code),
    achieved_at DATETIME NOT NULL,
    workout_set_id TEXT REFERENCES workout_sets(id) ON DELETE SET NULL,
    UNIQUE(user_id, exercise_id, pr_type)
);

-- Indexes for query performance (required per PRD risk section)
CREATE INDEX idx_workout_templates_user_id ON workout_templates(user_id);
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_start_time ON workouts(user_id, start_time);
CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX idx_workout_sets_exercise ON workout_sets(workout_exercise_id);
CREATE INDEX idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);
CREATE INDEX idx_body_measurements_user_date ON body_measurements(user_id, date);
CREATE INDEX idx_exercises_muscle_group ON exercises(muscle_group_id);
CREATE INDEX idx_exercises_custom ON exercises(user_id) WHERE is_custom = TRUE;
```
