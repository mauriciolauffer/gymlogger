import { reactive } from "vue";
import { client } from "../api/client";
import { settingsStore } from "./settings";
import type { SetType } from "../db/constants";

export interface ActiveWorkoutSet {
  id: string;
  workoutExerciseId: string;
  setType: SetType;
  weight: number;
  weightUnit: string;
  reps: number;
  rpe?: number | null;
  estimated1rm?: number | null;
  isPr?: boolean;
  prType?: string | null;
  orderIndex: number;
}

export interface ActiveWorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  exerciseName?: string;
  category?: string;
  notes?: string | null;
  supersetId?: string | null;
  orderIndex: number;
  sets: ActiveWorkoutSet[];
  previousSets?: ActiveWorkoutSet[];
}

export interface ActiveWorkout {
  id: string;
  title: string;
  startTime: string | Date;
  totalVolume: number;
  setCount: number;
  notes?: string | null;
  exercises: ActiveWorkoutExercise[];
}

interface LogSetBody {
  set_type?: string;
  weight?: number;
  weight_unit?: string;
  reps?: number;
  rpe?: number | null;
  order_index?: number;
}

interface LogSetResponse {
  set: {
    id: string;
    workout_exercise_id: string;
    set_type: string;
    weight: number;
    weight_unit: string;
    reps: number;
    rpe?: number | null;
    estimated_1rm?: number | null;
    is_pr?: number;
    pr_type?: string | null;
    order_index: number;
  };
  isPr: boolean;
  prTypes: string[];
}

interface RestTimerState {
  active: boolean;
  duration: number;
  remaining: number;
  intervalId: ReturnType<typeof setInterval> | null;
}

const state = reactive<{
  workout: ActiveWorkout | null;
  restTimer: RestTimerState;
  elapsedSeconds: number;
  durationTimerId: ReturnType<typeof setInterval> | null;
}>({
  workout: JSON.parse(localStorage.getItem("gymlogger_active_workout") || "null"),
  restTimer: {
    active: false,
    duration: 90,
    remaining: 0,
    intervalId: null,
  },
  elapsedSeconds: 0,
  durationTimerId: null,
});

export const activeWorkoutStore = {
  get workout() {
    return state.workout;
  },
  get isWorkingOut() {
    return !!state.workout;
  },
  get restTimer() {
    return state.restTimer;
  },
  get elapsedSeconds() {
    return state.elapsedSeconds;
  },

  saveLocal() {
    if (state.workout) {
      localStorage.setItem("gymlogger_active_workout", JSON.stringify(state.workout));
    } else {
      localStorage.removeItem("gymlogger_active_workout");
    }
  },

  startDurationTimer() {
    if (state.durationTimerId) clearInterval(state.durationTimerId);
    if (!state.workout) return;

    const startMs = new Date(state.workout.startTime).getTime();
    state.durationTimerId = setInterval(() => {
      state.elapsedSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    }, 1000);
  },

  stopDurationTimer() {
    if (state.durationTimerId) {
      clearInterval(state.durationTimerId);
      state.durationTimerId = null;
    }
  },

  async startWorkout(title = "Workout", templateId?: string) {
    const res = (await (
      await client.api.v1.workouts.start.$post({ json: { title, template_id: templateId } })
    ).json()) as unknown as { workout: ActiveWorkout };
    const fullWorkout = (await (
      await client.api.v1.workouts[":id"].$get({ param: { id: res.workout.id } })
    ).json()) as unknown as { workout: ActiveWorkout };
    if (fullWorkout && fullWorkout.workout) {
      state.workout = fullWorkout.workout;
      state.workout.exercises = state.workout.exercises || [];
    } else {
      state.workout = { ...res.workout, exercises: [] };
    }
    this.saveLocal();
    this.startDurationTimer();
  },

  async fetchActiveWorkout(id: string) {
    const res = (await (
      await client.api.v1.workouts[":id"].$get({ param: { id } })
    ).json()) as unknown as { workout: ActiveWorkout };
    state.workout = res.workout;
    if (state.workout) {
      state.workout.exercises = state.workout.exercises || [];
    }
    this.saveLocal();
    this.startDurationTimer();
  },

  async addExercise(exerciseId: string, supersetId?: string) {
    if (!state.workout) return;
    const res = (await (
      await client.api.v1.workouts[":id"].exercises.$post({
        param: { id: state.workout.id },
        json: { exercise_id: exerciseId, superset_id: supersetId },
      })
    ).json()) as unknown as { workoutExercise: ActiveWorkoutExercise };
    let previousSets: ActiveWorkoutSet[] = [];
    try {
      const prevData = (await (
        await client.api.v1.workouts["previous-values"].$get({ query: { exerciseId } })
      ).json()) as { sets: ActiveWorkoutSet[] };
      previousSets = prevData.sets || [];
    } catch {
      // non-fatal
    }

    const newEx = {
      ...res.workoutExercise,
      sets: [],
      previousSets,
    };
    state.workout.exercises = state.workout.exercises || [];
    state.workout.exercises.push(newEx);
    this.saveLocal();
  },

  async logSet(workoutExerciseId: string, setData: LogSetBody) {
    if (!state.workout) return null;
    const res = (await (
      await client.api.v1.workouts[":id"].sets.$post({
        param: { id: state.workout.id },
        json: { workout_exercise_id: workoutExerciseId, ...setData, rpe: setData.rpe ?? undefined },
      })
    ).json()) as unknown as LogSetResponse;

    const normalizedSet: ActiveWorkoutSet = {
      id: res.set.id,
      workoutExerciseId: res.set.workout_exercise_id,
      setType: res.set.set_type as ActiveWorkoutSet["setType"],
      weight: res.set.weight,
      weightUnit: res.set.weight_unit,
      reps: res.set.reps,
      rpe: res.set.rpe,
      estimated1rm: res.set.estimated_1rm,
      isPr: !!res.set.is_pr,
      prType: res.set.pr_type,
      orderIndex: res.set.order_index,
    };

    const exercise = state.workout.exercises?.find((e) => e.id === workoutExerciseId);
    if (exercise) {
      exercise.sets.push(normalizedSet);
    }

    const updated = (await (
      await client.api.v1.workouts[":id"].$get({ param: { id: state.workout.id } })
    ).json()) as unknown as { workout: ActiveWorkout };
    if (updated && updated.workout) {
      state.workout.totalVolume = updated.workout.totalVolume;
      state.workout.setCount = updated.workout.setCount;
    }

    this.saveLocal();

    const duration = settingsStore.settings.rest_timer_duration_seconds || 90;
    this.startRestTimer(duration);

    return res;
  },

  async updateSet(setId: string, setData: Partial<ActiveWorkoutSet>) {
    if (!state.workout) return null;
    const body: Record<string, unknown> = {};
    if (setData.setType !== undefined) body.set_type = setData.setType;
    if (setData.weight !== undefined) body.weight = setData.weight;
    if (setData.weightUnit !== undefined) body.weight_unit = setData.weightUnit;
    if (setData.reps !== undefined) body.reps = setData.reps;
    if (setData.rpe !== undefined) body.rpe = setData.rpe;
    const res = (await (
      await client.api.v1.workouts[":id"].sets[":setId"].$put({
        param: { id: state.workout.id, setId },
        json: body,
      })
    ).json()) as unknown as { set: ActiveWorkoutSet; isPr: boolean; prTypes: string[] };

    if (state.workout.exercises) {
      for (const ex of state.workout.exercises) {
        const idx = ex.sets.findIndex((s) => s.id === setId);
        if (idx !== -1) {
          ex.sets[idx] = res.set;
          break;
        }
      }
    }

    const updated = (await (
      await client.api.v1.workouts[":id"].$get({ param: { id: state.workout.id } })
    ).json()) as unknown as { workout: ActiveWorkout };
    if (updated && updated.workout) {
      state.workout.totalVolume = updated.workout.totalVolume;
      state.workout.setCount = updated.workout.setCount;
    }

    this.saveLocal();
    return res;
  },

  async deleteSet(setId: string) {
    if (!state.workout) return;
    await client.api.v1.workouts[":id"].sets[":setId"].$delete({
      param: { id: state.workout.id, setId },
    });

    if (state.workout.exercises) {
      for (const ex of state.workout.exercises) {
        ex.sets = ex.sets.filter((s) => s.id !== setId);
      }
    }

    const updated = (await (
      await client.api.v1.workouts[":id"].$get({ param: { id: state.workout.id } })
    ).json()) as unknown as { workout: ActiveWorkout };
    if (updated && updated.workout) {
      state.workout.totalVolume = updated.workout.totalVolume;
      state.workout.setCount = updated.workout.setCount;
    }

    this.saveLocal();
  },

  async finishWorkout(notes?: string) {
    if (!state.workout) return;
    const res = (await (
      await client.api.v1.workouts[":id"].finish.$put({
        param: { id: state.workout.id },
        json: { notes },
      })
    ).json()) as unknown as { workout: ActiveWorkout };
    this.stopDurationTimer();
    this.stopRestTimer();
    state.workout = null;
    this.saveLocal();
    return res?.workout;
  },

  startRestTimer(durationInSeconds: number) {
    this.stopRestTimer();
    state.restTimer.active = true;
    state.restTimer.duration = durationInSeconds;
    state.restTimer.remaining = durationInSeconds;

    state.restTimer.intervalId = setInterval(() => {
      if (state.restTimer.remaining > 0) {
        state.restTimer.remaining--;
      } else {
        this.stopRestTimer();
      }
    }, 1000);
  },

  stopRestTimer() {
    if (state.restTimer.intervalId) {
      clearInterval(state.restTimer.intervalId);
      state.restTimer.intervalId = null;
    }
    state.restTimer.active = false;
    state.restTimer.remaining = 0;
  },
};
