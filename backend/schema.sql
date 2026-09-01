-- Units of Measurement Central Lookup Table
CREATE TABLE IF NOT EXISTS units (
    code TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('weight', 'length')),
    name TEXT NOT NULL,
    symbol TEXT NOT NULL
);

-- Seed Default Units
INSERT OR IGNORE INTO units (code, type, name, symbol) VALUES
('kg', 'weight', 'Kilograms', 'kg'),
('lbs', 'weight', 'Pounds', 'lbs'),
('cm', 'length', 'Centimeters', 'cm'),
('in', 'length', 'Inches', 'in'),
('km', 'length', 'Kilometers', 'km'),
('m', 'length', 'Meters', 'm');

-- Users Profile Table
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT CHECK(theme IN ('light', 'dark', 'system')) DEFAULT 'system',
    preferred_weight_unit TEXT REFERENCES units(code) DEFAULT 'kg',
    preferred_length_unit TEXT REFERENCES units(code) DEFAULT 'cm',
    language TEXT DEFAULT 'en',
    rest_timer_duration_seconds INTEGER DEFAULT 90,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Body Measurements Table
CREATE TABLE IF NOT EXISTS body_measurements (
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
CREATE TABLE IF NOT EXISTS muscle_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Seed Default Muscle Groups
INSERT OR IGNORE INTO muscle_groups (id, name) VALUES
('mg_chest', 'Chest'),
('mg_back', 'Back'),
('mg_shoulders', 'Shoulders'),
('mg_biceps', 'Biceps'),
('mg_triceps', 'Triceps'),
('mg_quads', 'Quadriceps'),
('mg_hamstrings', 'Hamstrings'),
('mg_calves', 'Calves'),
('mg_abs', 'Abdominals'),
('mg_glutes', 'Glutes');

-- Exercises Library Table
CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    body_part TEXT NOT NULL,
    equipment TEXT,
    instructions TEXT,
    instruction_steps TEXT,
    muscle_group_id TEXT REFERENCES muscle_groups(id),
    target TEXT,
    media_id TEXT,
    image TEXT,
    gif_url TEXT,
    attribution TEXT,
    is_custom BOOLEAN DEFAULT FALSE,
    user_id TEXT REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed Preset Exercises
INSERT OR IGNORE INTO exercises (id, name, category, body_part, equipment, muscle_group_id, target, is_custom) VALUES
('ex_bench_press', 'Barbell Bench Press', 'chest', 'chest', 'barbell', 'mg_chest', 'pectoralis major', FALSE),
('ex_squat', 'Barbell Back Squat', 'quadriceps', 'upper legs', 'barbell', 'mg_quads', 'quadriceps', FALSE),
('ex_deadlift', 'Barbell Deadlift', 'back', 'back', 'barbell', 'mg_back', 'erector spinae', FALSE),
('ex_overhead_press', 'Overhead Press', 'shoulders', 'shoulders', 'barbell', 'mg_shoulders', 'deltoids', FALSE),
('ex_bicep_curl', 'Dumbbell Bicep Curl', 'biceps', 'arms', 'dumbbell', 'mg_biceps', 'biceps brachii', FALSE),
('ex_tricep_pushdown', 'Triceps Pushdown', 'triceps', 'arms', 'cable', 'mg_triceps', 'triceps brachii', FALSE);

-- Exercise Secondary Muscles Join Table (many-to-many)
CREATE TABLE IF NOT EXISTS exercise_secondary_muscles (
    exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    muscle_group_id TEXT NOT NULL REFERENCES muscle_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (exercise_id, muscle_group_id)
);

-- Seed Secondary Muscles
INSERT OR IGNORE INTO exercise_secondary_muscles (exercise_id, muscle_group_id) VALUES
('ex_bench_press', 'mg_triceps'),
('ex_bench_press', 'mg_shoulders'),
('ex_deadlift', 'mg_hamstrings'),
('ex_deadlift', 'mg_glutes');

-- Workout Templates Table
CREATE TABLE IF NOT EXISTS workout_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Workout Template Exercises Table
CREATE TABLE IF NOT EXISTS workout_template_exercises (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    superset_id TEXT,
    notes TEXT,
    order_index INTEGER NOT NULL
);

-- Workouts Table
CREATE TABLE IF NOT EXISTS workouts (
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

-- Workout Exercises Table
CREATE TABLE IF NOT EXISTS workout_exercises (
    id TEXT PRIMARY KEY,
    workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    superset_id TEXT,
    notes TEXT,
    order_index INTEGER NOT NULL
);

-- Workout Sets Table
CREATE TABLE IF NOT EXISTS workout_sets (
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
    pr_type TEXT,
    order_index INTEGER NOT NULL
);

-- Personal Records Cache Table
CREATE TABLE IF NOT EXISTS personal_records (
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workout_templates_user_id ON workout_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_start_time ON workouts(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, date);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group_id);
