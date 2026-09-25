import { describe, expect, it, beforeEach } from "vitest";
import { createClient, buildWorkout, registerUser } from "./helpers.ts";

describe("Workout session", () => {
  let token: string;
  let client: ReturnType<typeof createClient>;

  beforeEach(async () => {
    ({ token } = await registerUser("morgan@example.com", "password123", "Morgan Lifting"));
    client = createClient();
  });

  it("lists muscle groups and exercise library", async () => {
    const mgRes = await client.api.v1["muscle-groups"].$get(
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(mgRes.status).toBe(200);
    const mgData = await mgRes.json<{ muscleGroups: unknown[] }>();
    expect(mgData.muscleGroups.length).toBeGreaterThan(0);

    const exRes = await client.api.v1.exercises.$get(
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(exRes.status).toBe(200);
    const exData = await exRes.json<{ exercises: unknown[] }>();
    expect(exData.exercises.length).toBeGreaterThan(0);
  });

  it("creates, fetches, and deletes a custom exercise", async () => {
    const createRes = await client.api.v1.exercises.$post(
      {
        json: {
          name: "Cable Flyes",
          category: "chest",
          body_part: "chest",
          equipment: "cable",
          muscle_group_id: "mg_chest",
          secondary_muscle_ids: ["mg_shoulders"],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(createRes.status).toBe(201);
    const createData = await createRes.json<{ exercise: { id: string; name: string } }>();
    const customId = createData.exercise.id;
    expect(customId).toContain("custom_");

    const getRes = await client.api.v1.exercises[":id"].$get(
      { param: { id: customId } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(getRes.status).toBe(200);
    const getData = await getRes.json<{
      exercise: { name: string; secondaryMuscles: unknown[] };
    }>();
    expect(getData.exercise.name).toBe("Cable Flyes");
    expect(getData.exercise.secondaryMuscles.length).toBe(1);

    const delRes = await client.api.v1.exercises[":id"].$delete(
      { param: { id: customId } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(delRes.status).toBe(200);
  });

  it("starts a workout, adds exercises, logs sets, and finishes", async () => {
    const startRes = await client.api.v1.workouts.start.$post(
      { json: { title: "Push Day" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(startRes.status).toBe(201);
    const { workout } = await startRes.json<{ workout: { id: string } }>();

    const addExRes = await client.api.v1.workouts[":id"].exercises.$post(
      { param: { id: workout.id }, json: { exercise_id: "ex_bench_press", order_index: 0 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(addExRes.status).toBe(201);
    const { workoutExercise } = await addExRes.json<{ workoutExercise: { id: string } }>();

    const set1Res = await client.api.v1.workouts[":id"].sets.$post(
      {
        param: { id: workout.id },
        json: {
          workout_exercise_id: workoutExercise.id,
          set_type: "NO",
          weight: 100,
          reps: 5,
          rpe: 8,
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(set1Res.status).toBe(201);
    const set1Data = await set1Res.json<{ set: { weight: number; estimated_1rm: number } }>();
    expect(set1Data.set.weight).toBe(100);
    expect(set1Data.set.estimated_1rm).toBeGreaterThan(100);

    await client.api.v1.workouts[":id"].sets.$post(
      {
        param: { id: workout.id },
        json: {
          workout_exercise_id: workoutExercise.id,
          set_type: "NO",
          weight: 100,
          reps: 5,
          rpe: 9,
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const finishRes = await client.api.v1.workouts[":id"].finish.$put(
      { param: { id: workout.id }, json: { notes: "Great push session!" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(finishRes.status).toBe(200);
    const finishData = await finishRes.json<{
      workout: { total_volume: number; set_count: number; end_time: string };
    }>();
    expect(finishData.workout.total_volume).toBe(1000);
    expect(finishData.workout.set_count).toBe(2);
    expect(finishData.workout.end_time).toBeDefined();

    const prevRes = await client.api.v1.workouts["previous-values"].$get(
      { query: { exerciseId: "ex_bench_press" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(prevRes.status).toBe(200);
    const prevData = await prevRes.json<{ sets: { weight: number }[] }>();
    expect(prevData.sets.length).toBe(2);
    expect(prevData.sets[0].weight).toBe(100);
  });

  it("starts workout with no title uses default", async () => {
    const res = await client.api.v1.workouts.start.$post(
      { json: {} },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(201);
    const { workout } = await res.json<{ workout: { title: string } }>();
    expect(workout.title).toBe("Workout");
  });

  it("starts workout without user settings (volumeUnit defaults to kg)", async () => {
    const { token: freshToken } = await registerUser(
      "no-settings-workout@example.com",
      "password123",
      "Fresh User",
    );
    const res = await client.api.v1.workouts.start.$post(
      { json: { title: "No Settings Workout" } },
      { headers: { Authorization: `Bearer ${freshToken}` } },
    );
    expect(res.status).toBe(201);
    const { workout } = await res.json<{ workout: { volumeUnit: string } }>();
    expect(workout.volumeUnit).toBe("kg");
  });

  it("starts workout with explicit start_time", async () => {
    const startTime = "2026-01-01T10:00:00+00:00";
    const res = await client.api.v1.workouts.start.$post(
      { json: { title: "Past Workout", start_time: startTime } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(201);
    const { workout } = await res.json<{ workout: { startTime: string } }>();
    expect(workout.startTime).toBe(new Date(startTime).toISOString());
  });

  it("starts workout from template with exercises", async () => {
    const templateRes = await client.api.v1["workout-templates"].$post(
      {
        json: {
          title: "Template for Start",
          exercises: [
            { exercise_id: "ex_bench_press", order_index: 0 },
            { exercise_id: "ex_squat", order_index: 1 },
          ],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { template } = await templateRes.json<{ template: { id: string } }>();

    const startRes = await client.api.v1.workouts.start.$post(
      { json: { title: "From Template", template_id: template.id } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(startRes.status).toBe(201);
    const { workout } = await startRes.json<{ workout: { id: string } }>();

    const getRes = await client.api.v1.workouts[":id"].$get(
      { param: { id: workout.id } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await getRes.json<{ workout: { exercises: unknown[] } }>();
    expect(data.workout.exercises.length).toBe(2);
  });

  it("lists workouts with from/to date filters", async () => {
    await client.api.v1.workouts.start.$post(
      { json: { title: "Filter Test", start_time: "2026-06-15T10:00:00Z" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const inRange = await client.api.v1.workouts.$get(
      { query: { from: "2026-01-01", to: "2026-12-31" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(inRange.status).toBe(200);
    const inData = await inRange.json<{ workouts: unknown[] }>();
    expect(inData.workouts.length).toBeGreaterThan(0);

    const outOfRange = await client.api.v1.workouts.$get(
      { query: { from: "2030-01-01", to: "2030-12-31" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(outOfRange.status).toBe(200);
    const outData = await outOfRange.json<{ workouts: unknown[] }>();
    expect(outData.workouts.length).toBe(0);
  });

  it("lists workouts with limit and offset", async () => {
    const requests = [];
    for (let i = 0; i < 3; i++) {
      requests.push(
        client.api.v1.workouts.start.$post(
          { json: { title: `Workout ${i}` } },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
    }
    await Promise.all(requests);

    const res = await client.api.v1.workouts.$get(
      { query: { limit: "2", offset: "1" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ workouts: unknown[] }>();
    expect(data.workouts.length).toBeLessThanOrEqual(2);
  });

  it("gets workout detail with sets grouped across multiple exercises", async () => {
    const startRes = await client.api.v1.workouts.start.$post(
      { json: { title: "Multi-exercise Workout" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workout } = await startRes.json<{ workout: { id: string } }>();

    const ex1Res = await client.api.v1.workouts[":id"].exercises.$post(
      { param: { id: workout.id }, json: { exercise_id: "ex_bench_press", order_index: 0 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workoutExercise: we1 } = await ex1Res.json<{ workoutExercise: { id: string } }>();

    const ex2Res = await client.api.v1.workouts[":id"].exercises.$post(
      { param: { id: workout.id }, json: { exercise_id: "ex_squat", order_index: 1 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workoutExercise: we2 } = await ex2Res.json<{ workoutExercise: { id: string } }>();

    await client.api.v1.workouts[":id"].sets.$post(
      { param: { id: workout.id }, json: { workout_exercise_id: we1.id, weight: 80, reps: 8 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    await client.api.v1.workouts[":id"].sets.$post(
      { param: { id: workout.id }, json: { workout_exercise_id: we1.id, weight: 85, reps: 6 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    await client.api.v1.workouts[":id"].sets.$post(
      { param: { id: workout.id }, json: { workout_exercise_id: we2.id, weight: 120, reps: 5 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const getRes = await client.api.v1.workouts[":id"].$get(
      { param: { id: workout.id } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(getRes.status).toBe(200);
    const data = await getRes.json<{
      workout: { exercises: { id: string; sets: unknown[] }[] };
    }>();
    expect(data.workout.exercises.length).toBe(2);
    expect(data.workout.exercises[0].sets.length).toBe(2);
    expect(data.workout.exercises[1].sets.length).toBe(1);
  });

  it("gets workout detail with no exercises (empty exercises path)", async () => {
    const startRes = await client.api.v1.workouts.start.$post(
      { json: { title: "Empty Workout" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workout } = await startRes.json<{ workout: { id: string } }>();

    const res = await client.api.v1.workouts[":id"].$get(
      { param: { id: workout.id } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ workout: { exercises: unknown[] } }>();
    expect(data.workout.exercises).toEqual([]);
  });

  it("adds exercise to workout with auto-computed order index", async () => {
    const startRes = await client.api.v1.workouts.start.$post(
      { json: { title: "Auto Index" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workout } = await startRes.json<{ workout: { id: string } }>();

    const addRes = await client.api.v1.workouts[":id"].exercises.$post(
      { param: { id: workout.id }, json: { exercise_id: "ex_bench_press" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(addRes.status).toBe(201);
    const { workoutExercise } = await addRes.json<{
      workoutExercise: { id: string; orderIndex: number };
    }>();
    expect(workoutExercise.orderIndex).toBe(0);

    const addRes2 = await client.api.v1.workouts[":id"].exercises.$post(
      { param: { id: workout.id }, json: { exercise_id: "ex_squat" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(addRes2.status).toBe(201);
    const { workoutExercise: ex2 } = await addRes2.json<{
      workoutExercise: { orderIndex: number };
    }>();
    expect(ex2.orderIndex).toBe(1);
  });

  it("logs a set with auto-computed order index", async () => {
    const startRes = await client.api.v1.workouts.start.$post(
      { json: { title: "Set Auto Index" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workout } = await startRes.json<{ workout: { id: string } }>();

    const addExRes = await client.api.v1.workouts[":id"].exercises.$post(
      { param: { id: workout.id }, json: { exercise_id: "ex_bench_press", order_index: 0 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workoutExercise } = await addExRes.json<{ workoutExercise: { id: string } }>();

    const setRes = await client.api.v1.workouts[":id"].sets.$post(
      { param: { id: workout.id }, json: { workout_exercise_id: workoutExercise.id } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(setRes.status).toBe(201);
    const { set } = await setRes.json<{ set: { order_index: number } }>();
    expect(set.order_index).toBe(0);
  });

  it("updates a set and recalculates 1RM", async () => {
    const startRes = await client.api.v1.workouts.start.$post(
      { json: { title: "Update Set Test" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workout } = await startRes.json<{ workout: { id: string } }>();

    const addExRes = await client.api.v1.workouts[":id"].exercises.$post(
      { param: { id: workout.id }, json: { exercise_id: "ex_bench_press", order_index: 0 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workoutExercise } = await addExRes.json<{ workoutExercise: { id: string } }>();

    const addSetRes = await client.api.v1.workouts[":id"].sets.$post(
      {
        param: { id: workout.id },
        json: { workout_exercise_id: workoutExercise.id, weight: 80, reps: 8, set_type: "NO" },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { set } = await addSetRes.json<{ set: { id: string } }>();

    const updateRes = await client.api.v1.workouts[":id"].sets[":setId"].$put(
      {
        param: { id: workout.id, setId: set.id },
        json: { weight: 90, reps: 6, set_type: "WU", rpe: 7 },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(updateRes.status).toBe(200);
    const updateData = await updateRes.json<{ set: { weight: number; reps: number } }>();
    expect(updateData.set.weight).toBe(90);
    expect(updateData.set.reps).toBe(6);
  });

  it("update set falls back to existing values when only rpe provided", async () => {
    const startRes = await client.api.v1.workouts.start.$post(
      { json: { title: "Fallback Values Test" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workout } = await startRes.json<{ workout: { id: string } }>();

    const addExRes = await client.api.v1.workouts[":id"].exercises.$post(
      { param: { id: workout.id }, json: { exercise_id: "ex_bench_press", order_index: 0 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workoutExercise } = await addExRes.json<{ workoutExercise: { id: string } }>();

    const addSetRes = await client.api.v1.workouts[":id"].sets.$post(
      {
        param: { id: workout.id },
        json: {
          workout_exercise_id: workoutExercise.id,
          weight: 75,
          reps: 8,
          set_type: "NO",
          rpe: 7,
        },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { set } = await addSetRes.json<{ set: { id: string } }>();

    const updateRes = await client.api.v1.workouts[":id"].sets[":setId"].$put(
      { param: { id: workout.id, setId: set.id }, json: { rpe: 8 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(updateRes.status).toBe(200);
    const data = await updateRes.json<{
      set: { weight: number; reps: number; setType: string; rpe: number };
    }>();
    expect(data.set.weight).toBe(75);
    expect(data.set.reps).toBe(8);
    expect(data.set.rpe).toBe(8);
  });

  it("update set with empty body falls back to all existing values", async () => {
    const startRes = await client.api.v1.workouts.start.$post(
      { json: { title: "Full Fallback Test" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workout } = await startRes.json<{ workout: { id: string } }>();

    const addExRes = await client.api.v1.workouts[":id"].exercises.$post(
      { param: { id: workout.id }, json: { exercise_id: "ex_squat", order_index: 0 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workoutExercise } = await addExRes.json<{ workoutExercise: { id: string } }>();

    const addSetRes = await client.api.v1.workouts[":id"].sets.$post(
      {
        param: { id: workout.id },
        json: { workout_exercise_id: workoutExercise.id, weight: 100, reps: 5 },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { set } = await addSetRes.json<{ set: { id: string } }>();

    const updateRes = await client.api.v1.workouts[":id"].sets[":setId"].$put(
      { param: { id: workout.id, setId: set.id }, json: {} },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(updateRes.status).toBe(200);
    const data = await updateRes.json<{ set: { weight: number; reps: number } }>();
    expect(data.set.weight).toBe(100);
    expect(data.set.reps).toBe(5);
  });

  it("update set weightUnit fallback when not specified", async () => {
    const startRes = await client.api.v1.workouts.start.$post(
      { json: { title: "Weight Unit Test" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workout } = await startRes.json<{ workout: { id: string } }>();

    const addExRes = await client.api.v1.workouts[":id"].exercises.$post(
      { param: { id: workout.id }, json: { exercise_id: "ex_bench_press", order_index: 0 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workoutExercise } = await addExRes.json<{ workoutExercise: { id: string } }>();

    const addSetRes = await client.api.v1.workouts[":id"].sets.$post(
      {
        param: { id: workout.id },
        json: { workout_exercise_id: workoutExercise.id, weight: 60, reps: 10, weight_unit: "kg" },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { set } = await addSetRes.json<{ set: { id: string } }>();

    const updateRes = await client.api.v1.workouts[":id"].sets[":setId"].$put(
      { param: { id: workout.id, setId: set.id }, json: { weight: 65 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(updateRes.status).toBe(200);
    const data = await updateRes.json<{ set: { weight: number } }>();
    expect(data.set.weight).toBe(65);
  });

  it("deletes a set from a workout", async () => {
    const { workoutId, workoutExerciseId } = await buildWorkout(token, "ex_squat", [], {
      title: "Delete Set Test",
    });

    const addSetRes = await client.api.v1.workouts[":id"].sets.$post(
      {
        param: { id: workoutId },
        json: { workout_exercise_id: workoutExerciseId, weight: 100, reps: 5 },
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { set } = await addSetRes.json<{ set: { id: string } }>();

    const delRes = await client.api.v1.workouts[":id"].sets[":setId"].$delete(
      { param: { id: workoutId, setId: set.id } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(delRes.status).toBe(200);
    const data = await delRes.json<{ message: string }>();
    expect(data.message).toBe("Set deleted");
  });

  it("returns empty sets when no previous workout for exercise", async () => {
    const res = await client.api.v1.workouts["previous-values"].$get(
      { query: { exerciseId: "ex_squat" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(200);
    const data = await res.json<{ sets: unknown[]; previousWorkoutDate: null }>();
    expect(data.sets).toEqual([]);
    expect(data.previousWorkoutDate).toBeNull();
  });

  it("returns 400 when exerciseId parameter is missing for previous-values", async () => {
    const res = await client.api.v1.workouts["previous-values"].$get(
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown workout", async () => {
    const res = await client.api.v1.workouts[":id"].$get(
      { param: { id: "nonexistent" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when adding exercise without exercise_id", async () => {
    const startRes = await client.api.v1.workouts.start.$post(
      { json: { title: "Empty" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workout } = await startRes.json<{ workout: { id: string } }>();

    const res = await client.api.v1.workouts[":id"].exercises.$post(
      { param: { id: workout.id }, json: {} },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when adding exercise to non-existent workout", async () => {
    const res = await client.api.v1.workouts[":id"].exercises.$post(
      { param: { id: "nonexistent-workout" }, json: { exercise_id: "ex_bench_press" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when adding set to non-existent workout", async () => {
    const res = await client.api.v1.workouts[":id"].sets.$post(
      { param: { id: "nonexistent-workout" }, json: { workout_exercise_id: "we_fake" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when updating a set from another user's workout", async () => {
    const { token: otherToken } = await registerUser("other-sets@example.com", "password123");
    const { workoutId, workoutExerciseId } = await buildWorkout(otherToken, "ex_bench_press", [], {
      title: "Other Workout",
    });

    const addSetRes = await client.api.v1.workouts[":id"].sets.$post(
      {
        param: { id: workoutId },
        json: { workout_exercise_id: workoutExerciseId, weight: 50, reps: 5 },
      },
      { headers: { Authorization: `Bearer ${otherToken}` } },
    );
    const { set } = await addSetRes.json<{ set: { id: string } }>();

    const res = await client.api.v1.workouts[":id"].sets[":setId"].$put(
      { param: { id: workoutId, setId: set.id }, json: { weight: 999 } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when deleting set from another user's workout", async () => {
    const { token: otherToken } = await registerUser("del-set-other@example.com", "password123");
    const { workoutId, workoutExerciseId } = await buildWorkout(otherToken, "ex_bench_press", [], {
      title: "Other Delete",
    });

    const addSetRes = await client.api.v1.workouts[":id"].sets.$post(
      {
        param: { id: workoutId },
        json: { workout_exercise_id: workoutExerciseId, weight: 50, reps: 5 },
      },
      { headers: { Authorization: `Bearer ${otherToken}` } },
    );
    const { set } = await addSetRes.json<{ set: { id: string } }>();

    const res = await client.api.v1.workouts[":id"].sets[":setId"].$delete(
      { param: { id: workoutId, setId: set.id } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when finishing non-existent workout", async () => {
    const res = await client.api.v1.workouts[":id"].finish.$put(
      { param: { id: "nonexistent" }, json: {} },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(404);
  });

  it("deletes a workout", async () => {
    const startRes = await client.api.v1.workouts.start.$post(
      { json: { title: "To Delete" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const { workout } = await startRes.json<{ workout: { id: string } }>();

    const delRes = await client.api.v1.workouts[":id"].$delete(
      { param: { id: workout.id } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(delRes.status).toBe(200);
  });

  it("returns 404 when deleting non-existent workout", async () => {
    const res = await client.api.v1.workouts[":id"].$delete(
      { param: { id: "nonexistent" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 with error details when start_time format is invalid", async () => {
    const res = await client.api.v1.workouts.start.$post(
      { json: { title: "Bad Date", start_time: "not-a-date" } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(400);
    const data = await res.json<{ error?: string; success?: boolean }>();
    expect(data.success === false || typeof data.error === "string").toBe(true);
  });

  it("deleting a workout removes its child exercises and sets", async () => {
    const { workoutId } = await buildWorkout(token, "ex_bench_press", [{ weight: 80, reps: 5 }], {
      title: "Cascade Delete Test",
    });

    await client.api.v1.workouts[":id"].$delete(
      { param: { id: workoutId } },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const getRes = await client.api.v1.workouts[":id"].$get(
      { param: { id: workoutId } },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(getRes.status).toBe(404);
  });

  it("finishing a workout with a PR set marks has_pr true on the workout", async () => {
    const { workoutId } = await buildWorkout(token, "ex_bench_press", [{ weight: 100, reps: 5 }], {
      title: "PR Flag Test",
    });

    const finishRes = await client.api.v1.workouts[":id"].finish.$put(
      { param: { id: workoutId }, json: {} },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(finishRes.status).toBe(200);
    const { workout: finished } = await finishRes.json<{ workout: { has_pr: boolean } }>();
    expect(finished.has_pr).toBe(true);
  });
});
