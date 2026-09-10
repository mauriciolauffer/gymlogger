---
title: Database Schema Specification
description: Cloudflare D1 (SQLite) relational database schema for users, user settings, workouts, exercises, sets, body measurements, and units of measurement.
tags:
  - database
  - schema
  - d1
  - sqlite
version: 1.2.0
relations:
  - type: defined_in
    target: PRD.md
  - type: implemented_by
    target: API_ENDPOINTS.md
---

# GymLogger - Database Schema Specification (Cloudflare D1)

This document defines the relational database schema for GymLogger running on Cloudflare D1 (serverless SQLite).

The schema uses **Better Auth** tables (`user`, `session`, `account`, `verification`) for authentication alongside GymLogger domain tables. The Drizzle ORM schema is the source of truth (`src/db/schema.ts`).

## Entity Relationship Overview

```
 [units]
   │ 1
   ├─────────────── N [user_settings]
   ├─────────────── N [body_measurements]
   └─────────────── N [workout_sets]

 [user] (Better Auth) 1 ─────────── 1 [user_profile]
   │ 1                1 ─────────── 1 [user_settings]
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

- **`user`** (Better Auth): Core authentication table — id, email, name, emailVerified, image, timestamps.
- **`session`** (Better Auth): Active session records linked to `user`.
- **`account`** (Better Auth): OAuth/credential account records; stores `password` hash for credential provider.
- **`verification`** (Better Auth): Email verification tokens.
- **`units`**: Central lookup table defining supported units of measurement (e.g., `kg`, `lbs`, `cm`, `in`, `km`, `m`).
- **`user_profile`**: Extended user profile (location, birthday, sex, height, bio). One-to-one with `user`.
- **`user_settings`**: User preferences (theme, preferred units, language, rest timer, notifications). One-to-one with `user`.
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

## Schema Definition (Drizzle / SQLite)

```sql
-- ==========================================
-- BETTER AUTH TABLES
-- ==========================================

CREATE TABLE user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    email_verified INTEGER NOT NULL DEFAULT 0,  -- boolean
    image TEXT,
    created_at INTEGER NOT NULL,  -- Unix timestamp
    updated_at INTEGER NOT NULL
);

CREATE TABLE session (
    id TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    user_id TEXT NOT NULL REFERENCES user(id)
);
CREATE INDEX idx_session_user_id ON session(user_id);

CREATE TABLE account (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES user(id),
    issuer TEXT,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    access_token_expires_at INTEGER,
    refresh_token_expires_at INTEGER,
    scope TEXT,
    password TEXT,  -- bcrypt hash for credential provider
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER,
    updated_at INTEGER
);

-- ==========================================
-- GYMLOGGER DOMAIN TABLES
-- ==========================================

-- Units of Measurement Central Lookup Table
CREATE TABLE units (
    code TEXT PRIMARY KEY,  -- 'kg', 'lbs', 'cm', 'in', 'km', 'm'
    type TEXT NOT NULL,     -- 'weight' | 'length'
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

-- User Profile Table (extends Better Auth `user`)
CREATE TABLE user_profile (
    id TEXT PRIMARY KEY REFERENCES user(id),
    location TEXT,
    birthday TEXT,
    sex TEXT,       -- 'male' | 'female' | 'other' | 'prefer_not_to_say'
    height REAL,
    height_unit TEXT DEFAULT 'cm',
    bio TEXT,
    created_at TEXT
);

-- User Settings Table
CREATE TABLE user_settings (
    user_id TEXT PRIMARY KEY REFERENCES user(id),
    theme TEXT DEFAULT 'system',                      -- 'light' | 'dark' | 'system'
    preferred_weight_unit TEXT DEFAULT 'kg',
    preferred_length_unit TEXT DEFAULT 'cm',
    language TEXT DEFAULT 'en',
    rest_timer_duration_seconds INTEGER DEFAULT 90,
    notifications_enabled INTEGER DEFAULT 1,          -- boolean
    updated_at TEXT
);

-- Muscle Groups Lookup Table
CREATE TABLE muscle_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Exercises Library Table
CREATE TABLE exercises (
    id TEXT PRIMARY KEY,               -- 'custom_<uuid>' for custom; numeric string for presets
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    body_part TEXT NOT NULL,
    equipment TEXT,
    instructions TEXT,
    instruction_steps TEXT,            -- JSON array of ordered instruction steps
    muscle_group_id TEXT,
    target TEXT,
    media_id TEXT,
    image TEXT,
    gif_url TEXT,
    attribution TEXT,
    is_custom INTEGER DEFAULT 0,       -- boolean
    user_id TEXT,                      -- NULL for global; set for custom
    created_at TEXT
);
CREATE INDEX idx_exercises_muscle_group ON exercises(muscle_group_id);
CREATE INDEX idx_exercises_custom ON exercises(user_id);

-- Exercise Secondary Muscles Join Table (many-to-many)
CREATE TABLE exercise_secondary_muscles (
    exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    muscle_group_id TEXT NOT NULL REFERENCES muscle_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (exercise_id, muscle_group_id)
);

-- Workout Templates Table
CREATE TABLE workout_templates (
    id TEXT PRIMARY KEY,               -- 'wt_<uuid>'
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
);
CREATE INDEX idx_workout_templates_user_id ON workout_templates(user_id);

-- Workout Template Exercises Table
CREATE TABLE workout_template_exercises (
    id TEXT PRIMARY KEY,               -- 'wte_<uuid>'
    template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    superset_id TEXT,
    notes TEXT,
    order_index INTEGER NOT NULL
);
CREATE INDEX idx_workout_template_exercises_template_id ON workout_template_exercises(template_id);
CREATE INDEX idx_workout_template_exercises_exercise_id ON workout_template_exercises(exercise_id);

-- Workouts Table
CREATE TABLE workouts (
    id TEXT PRIMARY KEY,               -- 'wk_<uuid>'
    user_id TEXT NOT NULL REFERENCES user(id),
    template_id TEXT REFERENCES workout_templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'Workout',
    start_time TEXT NOT NULL,
    end_time TEXT,
    duration_seconds INTEGER,
    total_volume REAL DEFAULT 0,
    volume_unit TEXT DEFAULT 'kg',
    set_count INTEGER DEFAULT 0,
    has_pr INTEGER DEFAULT 0,          -- boolean
    notes TEXT,
    created_at TEXT
);
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_start_time ON workouts(user_id, start_time);

-- Workout Exercises Table
CREATE TABLE workout_exercises (
    id TEXT PRIMARY KEY,               -- 'we_<uuid>'
    workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    superset_id TEXT,
    notes TEXT,
    order_index INTEGER NOT NULL
);
CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);

-- Workout Sets Table
CREATE TABLE workout_sets (
    id TEXT PRIMARY KEY,               -- 'ws_<uuid>'
    workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_type TEXT DEFAULT 'normal',    -- 'normal' | 'warmup' | 'drop' | 'failure'
    weight REAL NOT NULL DEFAULT 0,
    weight_unit TEXT DEFAULT 'kg',
    reps INTEGER NOT NULL DEFAULT 0,
    rpe REAL,
    estimated_1rm REAL,
    estimated_1rm_formula TEXT,        -- 'epley' | 'brzycki'
    is_pr INTEGER DEFAULT 0,           -- boolean
    pr_type TEXT,                      -- '1rm' | 'weight' | 'volume' | 'reps'
    order_index INTEGER NOT NULL
);
CREATE INDEX idx_workout_sets_exercise ON workout_sets(workout_exercise_id);

-- Personal Records Cache Table (materialized for fast live PR detection)
CREATE TABLE personal_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    pr_type TEXT NOT NULL,             -- '1rm' | 'weight' | 'volume' | 'reps'
    value REAL NOT NULL,
    value_unit TEXT,
    achieved_at TEXT NOT NULL,
    workout_set_id TEXT REFERENCES workout_sets(id) ON DELETE SET NULL,
    UNIQUE(user_id, exercise_id, pr_type)
);
CREATE UNIQUE INDEX idx_personal_records_unique ON personal_records(user_id, exercise_id, pr_type);
CREATE INDEX idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);
CREATE INDEX idx_personal_records_achieved_at ON personal_records(user_id, achieved_at);

-- Body Measurements Table
CREATE TABLE body_measurements (
    id TEXT PRIMARY KEY,               -- 'bm_<uuid>'
    user_id TEXT NOT NULL REFERENCES user(id),
    date TEXT NOT NULL,
    weight REAL,
    weight_unit TEXT DEFAULT 'kg',
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
    length_unit TEXT DEFAULT 'cm',
    photo_url TEXT,
    created_at TEXT
);
CREATE INDEX idx_body_measurements_user_date ON body_measurements(user_id, date);
```
