# GymLogger

**GymLogger** is an edge-native workout tracker and gym logger API & backend application.

---

## 🛠️ Technology Stack
- **Frontend Framework**: Vue.js
- **Frontend Build Tool**: Vite
- **Frontend Design System**: [SAP UI5 Web Components](https://ui5.github.io/webcomponents/components/) (`@ui5/webcomponents`, `@ui5/webcomponents-fiori`, `@ui5/webcomponents-icons`)
- **API Gateway & Backend Runtime**: Cloudflare Workers
- **Web Framework**: [Hono](https://hono.dev/)
- **Programming Language**: TypeScript
- **Database**: Cloudflare D1 (Edge-native SQLite)
- **Code Linter**: oxlint
- **Code Formatter**: oxfmt
- **Test Automation**: Vitest

---

## 📋 Features & Scope

GymLogger focuses on core **Workout Logging** and **Progress Tracking** functionality:

### 🏋️ Workout Logging
- **Log & Track Workouts**: Start empty workouts or routine-based sessions.
- **Dynamic Set Management**: Add/remove sets, set types (`Normal`, `Warmup`, `Drop Set`, `Failure`), and RPE scale (1-10).
- **Previous Workout Values & Notes**: Contextual display of past weight/reps and custom exercise notes.
- **Built-in Calculators**: Warm-up set calculator and Weight calculator.
- **Supersets & Live PRs**: Link exercises into supersets and receive immediate notifications when personal records are broken.
- **Rest Timer & Live Activity**: Automatic rest countdown timer and real-time workout status.

### 📊 Progress Tracking
- **Gym Performance Analytics**: Historical volume, estimated 1RM (Epley/Brzycki formulas), total reps, and sets.
- **Monthly Report & Year in Review**: Summary dashboards of training volume, workout counts, and top PRs.
- **Muscle Distribution & Weekly Sets**: Visual breakdown of target muscle groups and target weekly set counts.
- **Body Measurements & Progress Photos**: Track body weight, body fat %, circumferences, and progress photos.
- **Consistency & Streaks**: Heatmaps and streak counts for active training weeks.

*(Note: Social, Coach, and Settings & Extra Features are excluded from scope)*

---

## 📄 Documentation

- [Product Requirement Document (PRD)](docs/PRD.md)
- [User Stories Document](docs/USER_STORIES.md)
- [Database Schema Specification](docs/DATABASE_SCHEMA.md)
- [API Endpoints Specification](docs/API_ENDPOINTS.md)
