import { reactive } from "vue";
import { api } from "../api/client";
import { settingsStore } from "./settings";

export interface ActiveWorkoutSet {
  id: string;
  workout_exercise_id: string;
  set_type: "normal" | "warmup" | "drop" | "failure";
  weight: number;
  weight_unit: string;
  reps: number;
  rpe?: number | null;
  estimated_1rm?: number;
  order_index: number;
}

export interface ActiveWorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  exercise_name?: string;
  category?: string;
  notes?: string | null;
  superset_id?: string | null;
  order_index: number;
  sets: ActiveWorkoutSet[];
  previousSets?: any[];
}

export interface ActiveWorkout {
  id: string;
  title: string;
  start_time: string;
  total_volume: number;
  set_count: number;
  notes?: string | null;
  exercises: ActiveWorkoutExercise[];
}

interface RestTimerState {
  active: boolean;
  duration: number;
  remaining: number;
  intervalId: any;
}

const state = reactive<{
  workout: ActiveWorkout | null;
  restTimer: RestTimerState;
  elapsedSeconds: number;
  durationTimerId: any;
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

    const startMs = new Date(state.workout.start_time).getTime();
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
    const res = await api.post<{ workout: ActiveWorkout }>("/api/v1/workouts/start", {
      title,
      template_id: templateId,
    });
    // fetch full details if created from template to get initialized exercises
    const fullWorkout = await api.get<{ workout: ActiveWorkout }>(`/api/v1/workouts/${res.workout.id}`);
    state.workout = fullWorkout.workout;
    state.workout.exercises = state.workout.exercises || [];
    this.saveLocal();
    this.startDurationTimer();
  },

  async fetchActiveWorkout(id: string) {
    const res = await api.get<{ workout: ActiveWorkout }>(`/api/v1/workouts/${id}`);
    state.workout = res.workout;
    this.saveLocal();
    this.startDurationTimer();
  },

  async addExercise(exerciseId: string, supersetId?: string) {
    if (!state.workout) return;
    const res = await api.post<{ workoutExercise: ActiveWorkoutExercise }>(
      `/api/v1/workouts/${state.workout.id}/exercises`,
      { exercise_id: exerciseId, superset_id: supersetId }
    );
    // Fetch previous values for pre-populating set reference
    let previousSets: any[] = [];
    try {
      const prevData = await api.get<{ sets: any[] }>(
        `/api/v1/workouts/previous-values?exerciseId=${exerciseId}`
      );
      previousSets = prevData.sets || [];
    } catch (e) {
      // non-fatal
    }

    const newEx = {
      ...res.workoutExercise,
      sets: [],
      previousSets,
    };
    state.workout.exercises.push(newEx);
    this.saveLocal();
  },

  async logSet(workoutExerciseId: string, setData: Partial<ActiveWorkoutSet>) {
    if (!state.workout) return null;
    const res = await api.post<{ set: ActiveWorkoutSet; isPr: boolean; prTypes: string[] }>(
      `/api/v1/workouts/${state.workout.id}/sets`,
      {
        workout_exercise_id: workoutExerciseId,
        ...setData,
      }
    );

    const exercise = state.workout.exercises.find((e) => e.id === workoutExerciseId);
    if (exercise) {
      exercise.sets.push(res.set);
    }

    // Refresh workout totals
    const updated = await api.get<{ workout: ActiveWorkout }>(`/api/v1/workouts/${state.workout.id}`);
    state.workout.total_volume = updated.workout.total_volume;
    state.workout.set_count = updated.workout.set_count;

    this.saveLocal();

    // Trigger Rest Timer
    const duration = settingsStore.settings.rest_timer_duration_seconds || 90;
    this.startRestTimer(duration);

    return res;
  },

  async updateSet(setId: string, setData: Partial<ActiveWorkoutSet>) {
    if (!state.workout) return null;
    const res = await api.put<{ set: ActiveWorkoutSet; isPr: boolean; prTypes: string[] }>(
      `/api/v1/workouts/${state.workout.id}/sets/${setId}`,
      setData
    );

    for (const ex of state.workout.exercises) {
      const idx = ex.sets.findIndex((s) => s.id === setId);
      if (idx !== -1) {
        ex.sets[idx] = res.set;
        break;
      }
    }

    const updated = await api.get<{ workout: ActiveWorkout }>(`/api/v1/workouts/${state.workout.id}`);
    state.workout.total_volume = updated.workout.total_volume;
    state.workout.set_count = updated.workout.set_count;

    this.saveLocal();
    return res;
  },

  async deleteSet(setId: string) {
    if (!state.workout) return;
    await api.delete(`/api/v1/workouts/${state.workout.id}/sets/${setId}`);

    for (const ex of state.workout.exercises) {
      ex.sets = ex.sets.filter((s) => s.id !== setId);
    }

    const updated = await api.get<{ workout: ActiveWorkout }>(`/api/v1/workouts/${state.workout.id}`);
    state.workout.total_volume = updated.workout.total_volume;
    state.workout.set_count = updated.workout.set_count;

    this.saveLocal();
  },

  async finishWorkout(notes?: string) {
    if (!state.workout) return;
    const res = await api.put<{ workout: ActiveWorkout }>(`/api/v1/workouts/${state.workout.id}/finish`, {
      notes,
    });
    this.stopDurationTimer();
    this.stopRestTimer();
    state.workout = null;
    this.saveLocal();
    return res.workout;
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
