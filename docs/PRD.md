# Product Requirement Document (PRD) - GymLogger

## 1. Executive Summary & Vision
**GymLogger** is an intuitive, highly responsive workout logging and progress tracking backend system and web application inspired by Hevy. Designed to run on modern edge infrastructure, GymLogger provides athletes with fast, reliable workout logging, comprehensive performance analytics, body measurement tracking, and real-time exercise calculators.

## 2. Technology Stack & Infrastructure
- **Infrastructure & API Gateway**: Cloudflare Workers
- **Framework**: Hono (Lightweight, fast Web framework for Cloudflare Workers)
- **Language**: TypeScript
- **Database**: Cloudflare D1 (Serverless SQLite at the edge)
- **Linter**: oxlint
- **Formatter**: oxfmt
- **Test Automation**: Vitest

---

## 3. Scope & Feature Requirements

GymLogger adopts the core pillars of Hevy's **Workout Logging** and **Progress Tracking** features while explicitly excluding Social, Coach, and Settings & Extra Features.

### 3.1 Workout Logging Module

1. **Log & Track Workouts**
   - Record active workouts with structured routines or ad-hoc sessions.
   - Support start timestamp, end timestamp, title, notes, and duration calculations.
2. **Start Empty Workout**
   - Quick launch for blank workout sessions without predefined routines.
   - Ability to add exercises dynamically from the exercise library during logging.
3. **Custom Exercise Notes**
   - Add/edit per-exercise notes during or prior to a workout session (e.g., seat height, form cues, tempo).
4. **Automatic Rest Timer**
   - Configurable rest timers triggered automatically upon completing a set.
   - Audio/haptic or notification cues when rest timer expires.
5. **Add & Remove Sets**
   - Dynamically append or delete sets within an exercise during logging.
6. **Workout Set Types**
   - Categorize each set by type:
     - `Normal`
     - `Warmup`
     - `Drop Set`
     - `Failure`
7. **Previous Workout Values**
   - Display previous weight and rep count for each set when starting an exercise, allowing effortless progressive overload targeting.
8. **Warm Up Set Calculator**
   - Calculate recommended warm-up weights and set progression based on target working set weight (e.g., 40%, 60%, 80%).
9. **Weight Plate Calculator**
   - Calculate exact plate combinations required per side based on bar weight and target weight (lb/kg support).
10. **RPE (Rating of Perceived Exertion)**
    - Track RPE (scale 1–10) per set to measure relative intensity alongside weight and reps.
11. **Supersets**
    - Group two or more exercises into supersets or tri-sets with linked progression.
12. **Saving a Workout**
    - Persist workout logs reliably to Cloudflare D1 database with total volume, set count, duration, and PR calculation.
13. **Live Personal Record Notification**
    - Real-time check and alert when completing a set/exercise that beats previous bests (1RM, Max Weight, Max Volume, Max Reps).
14. **Live Activity**
    - API endpoints supporting state polling or SSE/Live updates for ongoing workout state, rest timers, and elapsed duration.

---

### 3.2 Progress Tracking Module

1. **Gym Performance Tracking**
   - Historical tracking of volume load, estimated 1RM (One Rep Max using Epley/Brzycki formulas), total reps, and total sets over time.
2. **Monthly Report**
   - Aggregated summary generated per calendar month detailing total workouts, total volume, total duration, top hit PRs, and most trained muscles.
3. **Muscle Group Workout Chart**
   - Visual/data summary detailing total volume and set allocation broken down by target muscle groups (e.g., Chest, Back, Legs, Shoulders, Arms, Core).
4. **Sets Per Muscle Group Per Week**
   - Analytics endpoint & metrics for tracking weekly volume (sets per muscle group) relative to target hypertrophy volume ranges (e.g., 10-20 sets/week).
5. **Muscle Distribution Chart**
   - Percentage breakdown chart of muscle group focus across selectable date ranges (weekly, monthly, custom).
6. **Body Measurements**
   - Record and track historical body metrics over time: Weight, Body Fat %, Neck, Shoulders, Chest, Biceps, Waist, Hips, Thighs, Calves.
7. **Progress Photos**
   - Upload and manage progress photos paired with body measurement logs and timestamps.
8. **Track Exercise Performance**
   - Specific exercise drill-down history showing 1RM progression curve, weight progression curve, max reps curve, and historical log entries.
9. **Workout Consistency & Streak**
   - Track consecutive active weeks/days (streaks) and display weekly calendar heatmaps.
10. **Year in Review**
    - Annual summary dashboard summarizing total weight lifted, total workout duration, most frequently trained exercises, and milestone achievements.

---

## 4. Database Schema (Cloudflare D1)

```sql
-- Users Table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Body Measurements Table
CREATE TABLE body_measurements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    weight_kg REAL,
    body_fat_pct REAL,
    chest_cm REAL,
    waist_cm REAL,
    biceps_cm REAL,
    thighs_cm REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Exercises Table
CREATE TABLE exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- Barbell, Dumbbell, Machine, Cable, Bodyweight, etc.
    primary_muscle_group TEXT NOT NULL, -- Chest, Back, Legs, Shoulders, Arms, Core
    secondary_muscle_groups TEXT, -- JSON Array
    is_custom BOOLEAN DEFAULT FALSE,
    user_id TEXT REFERENCES users(id)
);

-- Workouts Table
CREATE TABLE workouts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_seconds INTEGER,
    total_volume_kg REAL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Workout Exercises Table
CREATE TABLE workout_exercises (
    id TEXT PRIMARY KEY,
    workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    superset_id TEXT, -- Null if not in a superset
    notes TEXT,
    order_index INTEGER NOT NULL
);

-- Workout Sets Table
CREATE TABLE workout_sets (
    id TEXT PRIMARY KEY,
    workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_type TEXT CHECK(set_type IN ('normal', 'warmup', 'drop', 'failure')) DEFAULT 'normal',
    weight_kg REAL NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0,
    rpe REAL,
    is_pr BOOLEAN DEFAULT FALSE,
    pr_type TEXT, -- '1rm', 'weight', 'volume', 'reps'
    order_index INTEGER NOT NULL
);
```

---

## 5. API Endpoints Specification (Hono Router)

### Workouts API
- `POST /api/v1/workouts/start` - Start dynamic empty or routine-based workout.
- `POST /api/v1/workouts/:id/sets` - Add set with type, weight, reps, RPE. Calculates PRs live.
- `PUT /api/v1/workouts/:id/finish` - Finish workout, calculate final stats, volume, and duration.
- `GET /api/v1/workouts/previous-values?exerciseId=:id` - Fetch set values from previous workout for exercise.

### Calculators API
- `GET /api/v1/calculators/warmup?targetWeight=:w` - Return warm-up set breakdown.
- `GET /api/v1/calculators/plates?targetWeight=:w&barWeight=:b` - Return plate breakdown per side.

### Analytics & Progress API
- `GET /api/v1/analytics/performance` - Retrieve 1RM, volume, and rep trends.
- `GET /api/v1/analytics/monthly-report` - Monthly aggregated metrics summary.
- `GET /api/v1/analytics/muscle-distribution` - Muscle group set count and percentage split.
- `GET /api/v1/analytics/sets-per-muscle-group` - Weekly sets per muscle group.
- `GET /api/v1/analytics/consistency` - Streak count and activity heatmap.
- `GET /api/v1/analytics/year-in-review?year=:year` - Annual workout analytics.

### Body Measurements API
- `POST /api/v1/body-measurements` - Record measurement log.
- `GET /api/v1/body-measurements` - Fetch historical body metrics.
