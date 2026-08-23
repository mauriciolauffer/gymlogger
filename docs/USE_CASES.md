# GymLogger Use Cases Document

## 1. Overview
This document outlines the primary use cases for **GymLogger**, covering both **Workout Logging** and **Progress Tracking** modules modeled after Hevy functionality (excluding Social, Coach, and Settings).

---

## 2. Workout Logging Use Cases

### UC-LOG-01: Start Empty Workout & Dynamic Logging
- **Primary Actor**: Gym Athlete
- **Preconditions**: User is logged in.
- **Main Flow**:
  1. User initiates a new empty workout.
  2. System initializes a workout session with start timestamp.
  3. User searches and selects exercises from the exercise library.
  4. User enters weight, reps, set types (Normal, Warmup, Drop Set, Failure), and RPE per set.
  5. User marks sets as completed.
  6. System saves workout logs to Cloudflare D1 and updates performance history.
- **Alternative / Edge Flows**:
  - *User cancels workout*: System discards session without saving to database.
  - *Network disconnection*: Session data is held locally until reconnected to edge Worker.
- **Postconditions**: Workout session saved with total duration, volume, and sets recorded.

---

### UC-LOG-02: Manage Rest Timer & Live Notifications
- **Primary Actor**: Gym Athlete
- **Preconditions**: Active workout session is in progress.
- **Main Flow**:
  1. User checks off a set as completed.
  2. System triggers the automatic rest countdown timer based on preconfigured duration for the exercise.
  3. System evaluates if set establishes a Personal Record (1RM, max weight, max reps, max volume).
  4. If PR is achieved, system presents a Live PR alert notification.
  5. Timer expires and alerts user via visual/auditory notification to begin next set.
- **Alternative / Edge Flows**:
  - *User manually skips rest timer*: System stops countdown immediately.
- **Postconditions**: Rest timer status tracked and PR flags stored for set.

---

### UC-LOG-03: View Previous Workout Values & Exercise Notes
- **Primary Actor**: Gym Athlete
- **Preconditions**: User has previously recorded at least one workout containing the selected exercise.
- **Main Flow**:
  1. User adds or views an exercise within an active workout.
  2. System queries previous workout values for the exercise (weight, reps, sets).
  3. System displays previous log as watermark/placeholder in set input fields for easy progressive overload comparison.
  4. User views or updates custom exercise notes (e.g. seat setting, machine pin position).
- **Postconditions**: User leverages historical context to guide target set weight and reps.

---

### UC-LOG-04: Calculate Warm Up Sets & Weight Plates
- **Primary Actor**: Gym Athlete
- **Preconditions**: Target working weight for an exercise is known.
- **Main Flow**:
  1. User opens Warm Up Set Calculator or Weight Plate Calculator tool.
  2. User specifies working weight (e.g., 100 kg) and barbell weight (e.g., 20 kg).
  3. System calculates warm-up set progression (e.g., 40% x 10, 60% x 5, 80% x 3).
  4. System calculates required weight plate combination per side (e.g., 1x 20kg, 1x 15kg, 1x 5kg).
  5. User applies calculated warm-up sets directly into workout session.
- **Postconditions**: Calculated warm-up sets added to workout set list.

---

### UC-LOG-05: Group Exercises into Supersets
- **Primary Actor**: Gym Athlete
- **Preconditions**: Active workout session with two or more exercises.
- **Main Flow**:
  1. User selects two or more exercises in the active session.
  2. User selects "Create Superset" option.
  3. System links selected exercises together visually and sequentially.
  4. User logs sets in alternating succession.
- **Postconditions**: Exercises saved with corresponding `superset_id` linkages.

---

## 3. Progress Tracking Use Cases

### UC-TRK-01: View Gym Performance & Exercise Charts
- **Primary Actor**: Gym Athlete
- **Preconditions**: User has logged workouts over time.
- **Main Flow**:
  1. User navigates to Performance Tracking view for a selected exercise.
  2. System aggregates historical data: 1RM curve (Epley formula), total volume load, max weight lifted, and max reps.
  3. System renders performance charts over selectable timeframes (1 Month, 3 Months, 6 Months, 1 Year, All Time).
- **Postconditions**: User receives visual analytics on strength progress over time.

---

### UC-TRK-02: View Monthly Report & Year in Review
- **Primary Actor**: Gym Athlete
- **Preconditions**: User has workout data in target calendar month/year.
- **Main Flow**:
  1. User selects Monthly Report or Year in Review option.
  2. System aggregates total workouts, total workout time, total weight lifted, top PRs, and top exercises.
  3. System displays summary dashboard card.
- **Postconditions**: Aggregated summary delivered to user.

---

### UC-TRK-03: Track Muscle Group Breakdown & Weekly Sets
- **Primary Actor**: Gym Athlete
- **Preconditions**: User logs workouts containing exercises mapped to muscle groups.
- **Main Flow**:
  1. User navigates to Muscle Distribution & Weekly Sets view.
  2. System categorizes total sets completed per muscle group over the current week (e.g., Chest: 14 sets, Back: 16 sets).
  3. System displays muscle distribution pie/bar chart showing relative focus.
  4. System highlights whether volume target range (e.g., 10-20 sets/week per muscle) is satisfied.
- **Postconditions**: User gains insights into muscle balance and volume adequacy.

---

### UC-TRK-04: Track Body Measurements & Progress Photos
- **Primary Actor**: Gym Athlete
- **Preconditions**: User is logged in.
- **Main Flow**:
  1. User enters new body measurement entry (Weight, Body Fat %, Chest, Waist, Arms, Thighs) with timestamp.
  2. User optionally attaches a progress photo to the log entry.
  3. System stores record in Cloudflare D1 database and image references in Cloudflare storage.
  4. User views historical measurement trend line graph.
- **Postconditions**: New measurement log created and trend graph updated.

---

### UC-TRK-05: Monitor Consistency & Workout Streaks
- **Primary Actor**: Gym Athlete
- **Preconditions**: User logs workouts periodically.
- **Main Flow**:
  1. User views Workout Consistency & Streak widget.
  2. System calculates active workout streak (number of consecutive weeks with at least N workouts completed).
  3. System displays calendar activity heatmap of completed workout days.
- **Postconditions**: Streak count and heatmap displayed to user.
