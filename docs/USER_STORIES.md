---
title: GymLogger User Stories
description: User story requirements and acceptance criteria mapping functional workflows for GymLogger.
tags:
  - user-stories
  - requirements
  - gymlogger
version: 1.0.0
relations:
  - type: defined_in
    target: PRD.md
  - type: targets_api
    target: API_ENDPOINTS.md
---

# GymLogger User Stories Specification

This document details the functional user stories, problem statements, acceptance criteria, and priority rankings for GymLogger, synthesizing and replacing the previous use cases.

---

### REQ-01: Account Creation

- **Problem to Solve**: New athletes need a personal account to securely save and access their workouts and progress data across devices.
- **User Story**: As a new athlete, I want to create a GymLogger account using my email and password, so that I can securely save and access my workouts and progress data.
- **Acceptance Criteria**:
  - Given I am on the registration screen, when I provide my name, email, and password, then an account is created if the email is unique and valid and password meets minimum security requirements.
  - User receives confirmation that the account was created successfully.
  - User can proceed to log in after registration.
- **Maps to Objective**: User Management
- **Priority Rank**: MUST

---

### REQ-11: Log In

- **Problem to Solve**: Registered athletes need to authenticate securely to access their workouts, progress, and personal data.
- **User Story**: As a registered athlete, I want to log in to GymLogger securely, so that I can access my workouts, progress, and personal data.
- **Acceptance Criteria**:
  - Given I am on the login screen, when I enter my email and password, then a successful login creates an authenticated session and redirects to the appropriate page.
  - Given invalid credentials, then a clear error message is produced.
  - Given an active session, when I select log out, then the session is terminated.
- **Maps to Objective**: User Management
- **Priority Rank**: MUST

---

### REQ-12: User Profile Setup

- **Problem to Solve**: Athletes need to configure personal profile information (name, date of birth, gender, height, weight) for a personalized app experience.
- **User Story**: As a new athlete, I want to set up my profile with information such as my name, date of birth, gender, height, and weight, so that GymLogger can personalise my experience and track my progress accurately.
- **Acceptance Criteria**:
  - Given I am on the profile settings screen, when I enter or update my profile information, then required fields are clearly identified and values are validated according to format and range.
  - Given I save valid profile changes, then confirmation is displayed and profile information persists between sessions.
- **Maps to Objective**: User Management
- **Priority Rank**: MUST

---

### REQ-13: System Settings & Preferences

- **Problem to Solve**: Users need to configure system preferences so the application behaves according to their preferences.
- **User Story**: As a GymLogger user, I want to configure my system preferences, so that the application behaves according to my preferences.
- **Acceptance Criteria**:
  - Given I am on the settings screen, when I configure available preferences (units kg/lb, theme, notifications), then preferences persist across sessions and devices.
  - Preferences have sensible default values.
  - Changing units does not alter the underlying workout data.
- **Maps to Objective**: User Management
- **Priority Rank**: MUST

---

### REQ-02: Start & Log a Workout Session

- **Problem to Solve**: Athletes need to quickly open a session, add exercises on the fly, and record sets without interrupting their workout.
- **User Story**: As an athlete mid-workout, I need to start an empty session, add exercises from the library, and log each set so that my full workout is captured accurately.
- **Acceptance Criteria**:
  - Given I am authenticated, when I tap "Start Workout", then a new session is created with a start timestamp and I can immediately add exercises.
  - Given an active session, when I add an exercise, then sets from my most recent prior session for that exercise are pre-populated as reference values.
  - Given an active session, when I log a set with weight, reps, set type (Normal, Warmup, Drop Set, Failure), RPE, or superset grouping, then the set is appended to the exercise and the running volume total updates.
- **Maps to Objective**: Workout Logging
- **Priority Rank**: MUST

---

### REQ-03: Live Personal Record Detection

- **Problem to Solve**: Athletes want immediate feedback when they hit a new personal best to stay motivated and validate progress.
- **User Story**: As an athlete logging a set, I need to be notified instantly when I beat a personal best so that I know my training is producing results.
- **Acceptance Criteria**:
  - Given a completed set, when the logged weight × reps results in an estimated 1RM, max weight, max volume, or max reps exceeding all prior records for that exercise, then a PR notification is displayed before the next set begins.
- **Maps to Objective**: Workout Logging
- **Priority Rank**: MUST

---

### REQ-04: Automatic Rest Timer

- **Problem to Solve**: Athletes need to track inter-set rest periods to maintain consistent training density without watching a clock.
- **User Story**: As an athlete who just completed a set, I need a configurable rest timer to start automatically so that I rest the right amount without losing track of time.
- **Acceptance Criteria**:
  - Given a set is marked complete, when the default or user-configured rest duration is set, then a countdown timer starts immediately and triggers an audio or notification cue when it expires.
- **Maps to Objective**: Workout Logging
- **Priority Rank**: MUST

---

### REQ-05: Exercise Performance Drill-Down

- **Problem to Solve**: Athletes need to review historical progression for a specific exercise to evaluate whether their program is driving strength gains.
- **User Story**: As an athlete reviewing my training, I need to see 1RM and weight progression curves for any exercise so that I can validate long-term strength improvements.
- **Acceptance Criteria**:
  - Given I select an exercise from the library, when I open its history view, then I see a 1RM progression curve, a max weight curve, a max reps curve, and a chronological list of logged sessions for that exercise.
- **Maps to Objective**: Progress Tracking
- **Priority Rank**: MUST

---

### REQ-06: Monthly Report & Periodic Analytics

- **Problem to Solve**: Athletes need a concise periodic summary to understand training consistency and output without manually aggregating logs.
- **User Story**: As an athlete reviewing last month's training, I need an automated monthly summary so that I can assess whether I met my volume and consistency targets.
- **Acceptance Criteria**:
  - Given a calendar month has passed, when I open the monthly report, then I see total workouts, total volume, total duration, top PRs set that month, most frequently trained muscle groups, and weekly sets per muscle group versus target hypertrophy ranges.
- **Maps to Objective**: Progress Tracking
- **Priority Rank**: MUST

---

### REQ-08: Workout Templates

- **Problem to Solve**: Athletes who follow a structured routine repeat the same exercise selection each session and need a way to start a workout without manually re-adding every exercise from scratch.
- **User Story**: As an athlete with a regular training routine, I need to save a workout as a template so that I can start future sessions from it instantly without rebuilding the exercise list each time.
- **Acceptance Criteria**:
  - Given I am authenticated, when I save a workout template with a title and an ordered list of exercises, then the template is stored and appears in my templates list.
  - Given I have a saved template, when I start a new workout from it, then a new session is created with all template exercises pre-added in the same order, ready for set logging.
  - Given I have a saved template, when I edit or delete it, then past sessions started from that template are unaffected.
- **Maps to Objective**: Workout Logging
- **Priority Rank**: MUST

---

### REQ-07: Capture Body Measurements

- **Problem to Solve**: Athletes tracking body composition need a structured log to record physical measurements linked to dates.
- **User Story**: As an athlete monitoring body composition, I need to log my body measurements so that my physical metric data is saved with accurate timestamps.
- **Acceptance Criteria**:
  - Given I am on the measurements screen, when I enter values for one or more body metrics (weight, body fat %, circumferences) with decoupled units, then the entry is saved with a timestamp.
- **Maps to Objective**: Progress Tracking
- **Priority Rank**: MUST

---

### REQ-09: Body Measurements Progress

- **Problem to Solve**: Athletes need to view historical measurement trends over time to evaluate physical progress.
- **User Story**: As an athlete monitoring body composition, I need to view my measurement history in chronological order so that I can track physical changes over time.
- **Acceptance Criteria**:
  - Given I have saved body measurement entries, when I open the measurement history view, then past entries are displayed in chronological order with metrics converted to my preferred units.
- **Maps to Objective**: Progress Tracking
- **Priority Rank**: SHOULD

---

### REQ-10: Visual Progress

- **Problem to Solve**: Athletes want visual confirmation of body composition changes alongside numerical measurements.
- **User Story**: As an athlete monitoring body composition, I need to add photos to my body measurements so that I can track visual changes in my physique over time.
- **Acceptance Criteria**:
  - Given I am on the measurements screen, when I attach a photo to a measurement entry, then the photo is saved and displayed alongside historical measurement entries.
- **Maps to Objective**: Progress Tracking
- **Priority Rank**: COULD
