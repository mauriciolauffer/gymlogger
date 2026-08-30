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

### REQ-01: User Authentication & Profile Setup

- **Problem to Solve**: Athletes need a personal account to persist their data and preferences across devices.
- **User Story**: As a new user, I need to create an account and configure my profile so that my workouts and measurements are saved and displayed in my preferred units.
- **Acceptance Criteria**:
  - Given I am on the registration screen, when I submit a valid email and password, then a user account is created and I am authenticated.
  - Given I am authenticated, when I update my profile details (name, location, birthday, sex, bio) or preferred weight or length unit, then all subsequent weight and measurement displays reflect that unit and profile state.
- **Maps to Objective**: User Management
- **Priority Rank**: 1

---

### REQ-02: Start & Log a Workout Session

- **Problem to Solve**: Athletes need to quickly open a session, add exercises on the fly, and record sets without interrupting their workout.
- **User Story**: As an athlete mid-workout, I need to start an empty session, add exercises from the library, and log each set so that my full workout is captured accurately.
- **Acceptance Criteria**:
  - Given I am authenticated, when I tap "Start Workout", then a new session is created with a start timestamp and I can immediately add exercises.
  - Given an active session, when I add an exercise, then sets from my most recent prior session for that exercise are pre-populated as reference values.
  - Given an active session, when I log a set with weight, reps, set type (Normal, Warmup, Drop Set, Failure), RPE, or superset grouping, then the set is appended to the exercise and the running volume total updates.
- **Maps to Objective**: Workout Logging
- **Priority Rank**: 2

---

### REQ-03: Live Personal Record Detection

- **Problem to Solve**: Athletes want immediate feedback when they hit a new personal best to stay motivated and validate progress.
- **User Story**: As an athlete logging a set, I need to be notified instantly when I beat a personal best so that I know my training is producing results.
- **Acceptance Criteria**:
  - Given a completed set, when the logged weight × reps results in an estimated 1RM, max weight, max volume, or max reps exceeding all prior records for that exercise, then a PR notification is displayed before the next set begins.
- **Maps to Objective**: Workout Logging
- **Priority Rank**: 3

---

### REQ-04: Automatic Rest Timer

- **Problem to Solve**: Athletes need to track inter-set rest periods to maintain consistent training density without watching a clock.
- **User Story**: As an athlete who just completed a set, I need a configurable rest timer to start automatically so that I rest the right amount without losing track of time.
- **Acceptance Criteria**:
  - Given a set is marked complete, when the default or user-configured rest duration is set, then a countdown timer starts immediately and triggers an audio or notification cue when it expires.
- **Maps to Objective**: Workout Logging
- **Priority Rank**: 4

---

### REQ-05: Exercise Performance Drill-Down

- **Problem to Solve**: Athletes need to review historical progression for a specific exercise to evaluate whether their program is driving strength gains.
- **User Story**: As an athlete reviewing my training, I need to see 1RM and weight progression curves for any exercise so that I can validate long-term strength improvements.
- **Acceptance Criteria**:
  - Given I select an exercise from the library, when I open its history view, then I see a 1RM progression curve, a max weight curve, a max reps curve, and a chronological list of logged sessions for that exercise.
- **Maps to Objective**: Progress Tracking
- **Priority Rank**: 5

---

### REQ-06: Monthly Report & Periodic Analytics

- **Problem to Solve**: Athletes need a concise periodic summary to understand training consistency and output without manually aggregating logs.
- **User Story**: As an athlete reviewing last month's training, I need an automated monthly summary so that I can assess whether I met my volume and consistency targets.
- **Acceptance Criteria**:
  - Given a calendar month has passed, when I open the monthly report, then I see total workouts, total volume, total duration, top PRs set that month, most frequently trained muscle groups, and weekly sets per muscle group versus target hypertrophy ranges.
- **Maps to Objective**: Progress Tracking
- **Priority Rank**: 6

---

### REQ-07: Body Measurements & Progress Photos

- **Problem to Solve**: Athletes tracking body composition need a structured log for measurements and photos linked to the same date as training data.
- **User Story**: As an athlete monitoring body composition, I need to log measurements and upload photos so that I can correlate physical changes with training and nutrition over time.
- **Acceptance Criteria**:
  - Given I am on the measurements screen, when I enter values for one or more body metrics (weight, body fat %, circumferences) with decoupled units and optionally attach a photo, then the entry is saved with a timestamp and displayed in chronological history.
- **Maps to Objective**: Progress Tracking
- **Priority Rank**: 7
