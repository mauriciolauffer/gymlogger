CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`issuer` text,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `body_measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`weight` real,
	`weight_unit` text DEFAULT 'kg',
	`body_fat_pct` real,
	`chest` real,
	`waist` real,
	`hips` real,
	`shoulders` real,
	`biceps` real,
	`forearms` real,
	`thighs` real,
	`calves` real,
	`neck` real,
	`length_unit` text DEFAULT 'cm',
	`photo_url` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_body_measurements_user_date` ON `body_measurements` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `exercise_secondary_muscles` (
	`exercise_id` text NOT NULL,
	`muscle_group_id` text NOT NULL,
	PRIMARY KEY(`exercise_id`, `muscle_group_id`)
);
--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`body_part` text NOT NULL,
	`equipment` text,
	`instructions` text,
	`instruction_steps` text,
	`muscle_group_id` text,
	`target` text,
	`media_id` text,
	`image` text,
	`gif_url` text,
	`attribution` text,
	`is_custom` integer DEFAULT false,
	`user_id` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_exercises_muscle_group` ON `exercises` (`muscle_group_id`);--> statement-breakpoint
CREATE INDEX `idx_exercises_custom` ON `exercises` (`user_id`);--> statement-breakpoint
CREATE TABLE `muscle_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `muscle_groups_name_unique` ON `muscle_groups` (`name`);--> statement-breakpoint
CREATE TABLE `personal_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`pr_type` text NOT NULL,
	`value` real NOT NULL,
	`value_unit` text,
	`achieved_at` integer NOT NULL,
	`workout_set_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_personal_records_unique` ON `personal_records` (`user_id`,`exercise_id`,`pr_type`);--> statement-breakpoint
CREATE INDEX `idx_personal_records_user_exercise` ON `personal_records` (`user_id`,`exercise_id`);--> statement-breakpoint
CREATE INDEX `idx_personal_records_achieved_at` ON `personal_records` (`user_id`,`achieved_at`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `idx_session_user_id` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `units` (
	`code` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`symbol` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`theme` text DEFAULT 'S',
	`preferred_weight_unit` text DEFAULT 'kg',
	`preferred_length_unit` text DEFAULT 'cm',
	`language` text DEFAULT 'en',
	`rest_timer_duration_seconds` integer DEFAULT 90,
	`notifications_enabled` integer DEFAULT true,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `user_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`location` text,
	`birthday` text,
	`sex` text,
	`height` real,
	`height_unit` text DEFAULT 'cm',
	`bio` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `workout_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`superset_id` text,
	`notes` text,
	`order_index` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workout_exercises_workout_id` ON `workout_exercises` (`workout_id`);--> statement-breakpoint
CREATE INDEX `idx_workout_exercises_exercise_id` ON `workout_exercises` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_exercise_id` text NOT NULL,
	`set_type` text DEFAULT 'NO',
	`weight` real DEFAULT 0 NOT NULL,
	`weight_unit` text DEFAULT 'kg',
	`reps` integer DEFAULT 0 NOT NULL,
	`rpe` real,
	`estimated_1rm` real,
	`estimated_1rm_formula` text,
	`is_pr` integer DEFAULT false,
	`pr_type` text,
	`order_index` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workout_sets_exercise` ON `workout_sets` (`workout_exercise_id`);--> statement-breakpoint
CREATE TABLE `workout_template_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`superset_id` text,
	`notes` text,
	`order_index` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workout_template_exercises_template_id` ON `workout_template_exercises` (`template_id`);--> statement-breakpoint
CREATE INDEX `idx_workout_template_exercises_exercise_id` ON `workout_template_exercises` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `workout_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_workout_templates_user_id` ON `workout_templates` (`user_id`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`template_id` text,
	`title` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`duration_seconds` integer,
	`total_volume` real DEFAULT 0,
	`volume_unit` text DEFAULT 'kg',
	`set_count` integer DEFAULT 0,
	`has_pr` integer DEFAULT false,
	`notes` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_workouts_user_id` ON `workouts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_workouts_start_time` ON `workouts` (`user_id`,`start_time`);