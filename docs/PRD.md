---
title: Product Requirement Document (PRD) - GymLogger
description: Product Requirement Document defining project vision, scope, module requirements, tech stack, and documentation standards for GymLogger.
tags:
  - prd
  - specifications
  - gymlogger
version: 1.0.0
relations:
  - type: references
    target: USE_CASES.md
  - type: references
    target: DATABASE_SCHEMA.md
  - type: references
    target: API_ENDPOINTS.md
---

# Product Requirement Document (PRD) - GymLogger

## 1. Executive Summary & Vision
**GymLogger** is an intuitive, highly responsive workout logging and progress tracking backend system and web application. Designed to run on modern edge infrastructure, GymLogger provides athletes with fast, reliable workout logging, comprehensive performance analytics, body measurement tracking, and real-time exercise calculators.

## 2. Technology Stack & Infrastructure
- **Frontend Framework**: Vue.js
- **Frontend Build Tool & Bundler**: Vite
- **Frontend Design System**: SAP UI5 Web Components (`@ui5/webcomponents`, `@ui5/webcomponents-fiori`, `@ui5/webcomponents-icons`)
- **Infrastructure & API Gateway**: Cloudflare Workers
- **Backend Framework**: Hono (Lightweight, fast Web framework for Cloudflare Workers)
- **Language**: TypeScript
- **Database**: Cloudflare D1 (Serverless SQLite at the edge)
- **Linter**: oxlint
- **Formatter**: oxfmt
- **Test Automation**: Vitest
- **Documentation Standard**: Open Knowledge Format (OKF) with YAML frontmatter and bundle manifest.

---

## 3. Scope & Feature Requirements

GymLogger focuses on core **Workout Logging** and **Progress Tracking** features structured around an Exercise Library and a hierarchical Workout model (`1 Workout` -> `N Exercises` -> `N Sets`).

### 3.1 Exercise Library & Exercise Management

1. **Global Exercise Library**
   - Pre-populated library of standard strength training exercises (Barbell, Dumbbell, Machine, Cable, Bodyweight).
   - Each exercise metadata defines primary muscle group, secondary muscle groups, and exercise equipment category.
2. **Custom Exercises**
   - Ability for athletes to create user-defined custom exercises added to their personal exercise library.
3. **Exercise Selection for Workouts**
   - Searchable, filterable exercise picker enabling users to select and attach exercises from the library directly into any active or planned workout session.

---

### 3.2 Workout Logging Module

1. **Log & Track Workouts (1:N Exercises, 1:N Sets Hierarchy)**
   - Every workout session contains multiple exercises (`workout_exercises`).
   - Every exercise within a workout contains multiple individual set records (`workout_sets`).
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
   - Calculate recommended warm-up weight percentages and set progression directly from total target working weight (e.g., 40%, 60%, 80% of total target weight).
9. **Weight Calculator**
   - Simplified total weight calculation taking total weight input directly from the user without requiring separate bar weight or per-side plate inputs.
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

### 3.3 Progress Tracking Module

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

## 4. Technical Specifications & Reference

All documentation files in `/docs` follow the Open Knowledge Format (OKF) standard with structured YAML frontmatter and interlinked relations:

- **Database Schema**: Refer to [docs/DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for the complete Cloudflare D1 relational database schema.
- **API Endpoints**: Refer to [docs/API_ENDPOINTS.md](API_ENDPOINTS.md) for the complete REST API endpoint specifications.
- **Use Cases**: Refer to [docs/USE_CASES.md](USE_CASES.md) for functional actor flows and edge cases.
- **Manifest Index**: Refer to [docs/manifest.yaml](manifest.yaml) for the OKF bundle manifest.
