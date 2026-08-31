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
    target: USER_STORIES.md
  - type: references
    target: DATABASE_SCHEMA.md
  - type: references
    target: API_ENDPOINTS.md
---

# Product Requirement Document (PRD) - GymLogger

## Product Purpose & Value Proposition

### Elevator Pitch

Athletes need a fast, reliable tool to log workouts and track progress — recording exercises, sets, weights, and body measurements — without friction or spreadsheets. GymLogger is an intuitive workout logging and progress tracking web application built on modern edge infrastructure, giving athletes real-time feedback, personal record alerts, and comprehensive performance analytics.

### Product Principles

1. **Speed at the edge**: Every logging action (recording a set, saving a workout, loading history) must feel instant — the app is built on Cloudflare Workers and D1 to minimize latency globally.
2. **Frictionless logging**: The workout logging UI must require zero setup — athletes should be able to start an empty session and add exercises on the fly without prior planning.
3. **Transparent progress**: Performance calculations (1RM, volume, streaks) are always visible and based on documented formulas; athletes should never be surprised by what a number means.
4. **Unit flexibility**: All weight and length values are decoupled from units — athletes choose their preferred units and the system stores and displays accordingly without loss of data fidelity.

---

## User Profiles & Personas

### Primary Persona: Sam — Recreational Athlete (Self-coached Gym-goer)

Sam is a 28-year-old gym enthusiast who trains 3–5 days per week. Sam tracks workouts to ensure progressive overload and measure long-term strength gains. Currently, Sam relies on a notebook or a generic notes app, making it hard to review past performance or spot trends. Sam is comfortable with mobile and web apps and needs a tool that stays out of the way during a set but surfaces the right data at the right moment. Success for Sam means logging a full workout session in under 5 minutes of active screen time, and being able to answer "am I getting stronger?" at a glance.

### Secondary Persona: Morgan — Dedicated Lifter (Performance-focused)

Morgan is a 32-year-old intermediate lifter following a structured program. Morgan wants granular analytics — weekly volume by muscle group, 1RM progression curves, and body composition trends — to validate that the program is working. Morgan is data-savvy and expects charts and summary statistics to be accurate and based on established formulas (Epley/Brzycki). Success for Morgan means the monthly report and exercise drill-downs replace a separate spreadsheet.

### Other User Types

- **New User**: Creates an account, configures preferred units and theme, and begins logging without needing to read documentation.

---

## User Goals & Tasks

### For Sam (Recreational Athlete):

**Goals:**
- Start and complete a workout session quickly without pre-configuration
- Record every set with weight, reps, and type without interrupting workout rhythm
- Know immediately whether a set is a personal record
- Review what was done last session before starting the next one

**Key Tasks:**
- Launch an empty workout and add exercises from the searchable library
- Log sets with weight, reps, set type (Normal/Warmup/Drop Set/Failure), and optional RPE
- See previous session's values for each exercise automatically populated
- Receive a live notification when a set beats a personal best
- Save the completed workout and have total volume, set count, and duration recorded

### For Morgan (Dedicated Lifter):

**Goals:**
- Analyze strength progression per exercise over time
- Track weekly volume per muscle group against hypertrophy targets
- Monitor body composition trends alongside training data

**Key Tasks:**
- View 1RM progression curves, weight progression curves, and max rep history per exercise
- Check weekly sets per muscle group versus target ranges (e.g., 10–20 sets/week)
- Review monthly summary: total workouts, total volume, top PRs, most trained muscles
- Log and review historical body measurements (weight, body fat %, circumferences)
- Upload and browse progress photos paired with measurement logs

---

## Goals and Non-Goals

### Goals (In Scope)

- User account creation, authentication, and profile management (email, name, location, birthday, sex, bio)
- User preferences: theme, preferred weight unit, preferred length unit, language
- Global exercise library (Barbell, Dumbbell, Machine, Cable, Bodyweight) with muscle group metadata
- Custom user-defined exercises
- Workout logging with hierarchical structure: Workout → Exercises → Sets
- Set attributes: weight (unit-decoupled), reps, set type, RPE
- Automatic rest timer with configurable duration and expiry notification
- Previous session values shown per exercise during logging
- Warm-up set calculator (percentage-based off target working weight)
- Weight calculator (total weight from user input)
- Supersets and tri-sets with linked exercise grouping
- Live personal record detection and notification during logging
- Live activity API (SSE or polling) for rest timers and elapsed session duration
- Workout persistence: total volume, volume unit, set count, duration, PR flags
- Progress tracking: volume load, estimated 1RM, reps, sets over time
- Monthly report: workouts, volume, duration, PRs, top muscles
- Muscle group breakdown charts (volume and set allocation)
- Weekly sets per muscle group versus hypertrophy target ranges
- Muscle distribution chart with selectable date ranges
- Body measurements logging (10 metrics) with unit references
- Progress photos linked to measurement logs
- Exercise performance drill-down (1RM curve, weight curve, max reps curve, log history)
- Workout consistency streaks and weekly calendar heatmaps
- Year in Review annual summary dashboard
- Workout templates: save a named exercise list and reuse it to start future sessions

### Non-Goals (Out of Scope)

- Coaching or program prescription features — athletes log their own sessions; no auto-generated programs in v1
- Social or sharing features — no public profiles, feeds, or friend comparisons
- Native mobile apps (iOS/Android) — web application only in v1
- Integration with wearables or external fitness APIs (Garmin, Apple Health, Google Fit)
- Barbell plate calculator (load from per-side plates) — simplified total weight input only
- Video or animation guidance for exercises
- Nutrition or calorie tracking

---

## Requirements

Refer to [USER_STORIES.md](USER_STORIES.md) for the complete list of functional user stories, acceptance criteria, and priority rankings (REQ-01 through REQ-07).

---

## Non-Functional Requirements

### Performance

- **Latency**: All primary logging actions (log a set, save a workout, load exercise history) must respond in under 500 ms at the 95th percentile globally, leveraging Cloudflare Workers edge routing.
- **Throughput**: The API must handle concurrent sessions from independent users without degradation; Cloudflare Workers auto-scaling is the baseline guarantee.

### Reliability

- **Availability**: Target 99.9% uptime, consistent with Cloudflare Workers SLA.
- **Durability**: Workout data written to Cloudflare D1 must not be lost on worker restart or edge node failover.
- **Fallback**: If a D1 write fails, return a clear error to the client; no silent data loss and no partial saves presented as successful.

### Explainability

- **Formula transparency**: All estimated 1RM calculations must document which formula (Epley or Brzycki) was applied. The formula used must be stored with each computed record so historical values remain interpretable if the default formula changes.
- **Unit traceability**: Every weight and measurement record stores its unit code as a foreign key to the `units` lookup table; unit conversion is performed at display time, never at write time.

### Security

- **Authentication**: All API endpoints require a valid authenticated session; unauthenticated requests return 401.
- **Authorization**: Users may only read and write their own data; cross-user data access must be rejected at the service layer.

---

## Solution Architecture

**Architecture Overview:**
A serverless edge application consisting of a Hono (TypeScript) backend deployed on Cloudflare Workers, with a Vue.js + SAP UI5 Web Components frontend. Data is persisted in Cloudflare D1 (serverless SQLite at the edge). The solution is self-contained with no external fitness platform dependencies in v1.

**Key Components:**

- **Hono Backend (Cloudflare Workers)**: Manages user profiles, exercise library, workout sessions, set logging, personal record detection, progress analytics, and body measurements. Exposes a REST API consumed by the frontend.
- **Vue.js Frontend**: Athlete-facing UI for workout logging, exercise library browsing, progress charts, measurement logging, and the monthly report dashboard. Built with SAP UI5 Web Components for a consistent, accessible design system.
- **Cloudflare D1**: Persistent relational data store (SQLite) for users, settings, exercises, workouts, sets, measurements, and the central `units` lookup table.

**Integration Points:**

- None in v1. Future integration with wearable platforms (Garmin Connect API, Apple HealthKit).

**Deployment Environments:**

- **Dev**: Local Wrangler development environment with a local D1 instance.
- **Production**: Cloudflare Workers production deployment with the production D1 database.

### Configuration & Data

**Configuration Scope:**
User-level preferences (theme, weight unit, length unit, language) are configurable via the settings screen in the application without any deployment changes.

**Master Data:**
- Global exercise library — seeded at deployment; extended by user-defined custom exercises.
- `units` lookup table — seeded with `kg`, `lbs`, `cm`, `in`; referenced by all weight and measurement records as a foreign key.
- User profile and settings — owned and managed by each authenticated user.

---

## Risks, Assumptions, and Dependencies

### Risks

- **D1 query performance at scale**: Cloudflare D1 is serverless SQLite; complex analytical queries (1RM curves, monthly aggregates) over large workout histories may hit latency limits. Indexes on `user_id`, `exercise_id`, and `logged_at` are required from the start.
- **Formula accuracy**: Epley and Brzycki 1RM estimates diverge at extreme rep ranges. Users performing high-rep sets (>12 reps) may see misleading estimated 1RM values. The UI should note the formula and its typical reliable range.
- **Progress photo storage**: Cloudflare Workers does not natively serve large binary assets; progress photos will require Cloudflare R2 or an equivalent object store, which is a separate dependency not present in the initial stack description.
- **Data privacy**: User profile fields (birthday, sex, body measurements, progress photos) constitute sensitive personal data. Applicable data protection regulations (e.g., GDPR, CCPA) must be considered before storing or exposing these fields.

### Assumptions

- All users access the application via a modern web browser; no native mobile app wrapper is required in v1.
- Cloudflare D1 is sufficient for the expected data volumes of individual athlete workout histories in v1.
- oxlint and oxfmt are used for linting and formatting; Vitest is used for unit and integration testing.
- The `units` lookup table is the single source of truth for all unit codes; no free-text unit strings are stored elsewhere.

### Dependencies

- Cloudflare account with Workers and D1 entitlements.
- Cloudflare R2 (or equivalent) if progress photo upload is implemented in v1.
- SAP UI5 Web Components (`@ui5/webcomponents`, `@ui5/webcomponents-fiori`, `@ui5/webcomponents-icons`) for the frontend design system.

---

## Technical Specifications & Reference

All documentation files in `/docs` follow the Open Knowledge Format (OKF) standard with structured YAML frontmatter and interlinked relations:

- **Database Schema**: Refer to [docs/DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for the complete Cloudflare D1 relational database schema, including `users`, `user_settings`, and `units` lookup tables.
- **API Endpoints**: Refer to [docs/API_ENDPOINTS.md](API_ENDPOINTS.md) for the complete REST API endpoint specifications.
- **User Stories**: Refer to [docs/USER_STORIES.md](USER_STORIES.md) for functional user stories and acceptance criteria.
- **Manifest Index**: Refer to [docs/manifest.yaml](manifest.yaml) for the OKF bundle manifest.

---

## Open Questions

- Should personal record detection compare against all-time bests only, or also support period-scoped PRs (e.g., "best in the last 90 days")?
- Is progress photo storage in scope for v1, and if so, which object store (Cloudflare R2 vs. external CDN) is preferred?
- Should the warm-up set calculator output a fixed progression (e.g., 40%/60%/80%) or be configurable per user?
- What is the intended behavior when a user changes their preferred unit mid-history — should historical display values convert retroactively or remain in the unit stored at the time of logging?
- Should supersets enforce alternating exercise order during logging, or allow free-form set entry across grouped exercises?
