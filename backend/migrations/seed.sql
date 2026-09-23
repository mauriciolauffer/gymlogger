-- Units of Measurement
INSERT OR IGNORE INTO units (code, type, name, symbol) VALUES
('kg', 'weight', 'Kilograms', 'kg'),
('lbs', 'weight', 'Pounds', 'lbs'),
('cm', 'length', 'Centimeters', 'cm'),
('in', 'length', 'Inches', 'in'),
('km', 'length', 'Kilometers', 'km'),
('m', 'length', 'Meters', 'm');

-- Muscle Groups
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

-- Preset Exercises
INSERT OR IGNORE INTO exercises (id, name, category, body_part, equipment, muscle_group_id, target, is_custom) VALUES
('ex_bench_press', 'Barbell Bench Press', 'chest', 'chest', 'barbell', 'mg_chest', 'pectoralis major', FALSE),
('ex_squat', 'Barbell Back Squat', 'quadriceps', 'upper legs', 'barbell', 'mg_quads', 'quadriceps', FALSE),
('ex_deadlift', 'Barbell Deadlift', 'back', 'back', 'barbell', 'mg_back', 'erector spinae', FALSE),
('ex_overhead_press', 'Overhead Press', 'shoulders', 'shoulders', 'barbell', 'mg_shoulders', 'deltoids', FALSE),
('ex_bicep_curl', 'Dumbbell Bicep Curl', 'biceps', 'arms', 'dumbbell', 'mg_biceps', 'biceps brachii', FALSE),
('ex_tricep_pushdown', 'Triceps Pushdown', 'triceps', 'arms', 'cable', 'mg_triceps', 'triceps brachii', FALSE);

-- Exercise Secondary Muscles
INSERT OR IGNORE INTO exercise_secondary_muscles (exercise_id, muscle_group_id) VALUES
('ex_bench_press', 'mg_triceps'),
('ex_bench_press', 'mg_shoulders'),
('ex_deadlift', 'mg_hamstrings'),
('ex_deadlift', 'mg_glutes');
