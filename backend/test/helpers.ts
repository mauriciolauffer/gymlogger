import { env } from "cloudflare:workers";
import app from "../src/index";

export async function registerUser(
  email: string,
  password: string,
  name = "Test User",
): Promise<{ token: string; userId: string }> {
  const res = await app.request(
    "/api/auth/sign-up/email",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    },
    env,
  );
  const token = res.headers.get("set-auth-token") ?? "";
  const data = await res.json<{ user: { id: string } }>();
  return { token, userId: data.user.id };
}

export async function buildWorkout(
  token: string,
  exerciseId: string,
  sets: { weight?: number; reps?: number; set_type?: string; rpe?: number }[],
  opts?: { title?: string; start_time?: string },
): Promise<{ workoutId: string; workoutExerciseId: string }> {
  const wRes = await app.request(
    "/api/v1/workouts/start",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: opts?.title ?? "Workout", ...(opts?.start_time && { start_time: opts.start_time }) }),
    },
    env,
  );
  const { workout } = await wRes.json<{ workout: { id: string } }>();

  const exRes = await app.request(
    `/api/v1/workouts/${workout.id}/exercises`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ exercise_id: exerciseId }),
    },
    env,
  );
  const { workoutExercise } = await exRes.json<{ workoutExercise: { id: string } }>();

  for (const s of sets) {
    await app.request(
      `/api/v1/workouts/${workout.id}/sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workout_exercise_id: workoutExercise.id, ...s }),
      },
      env,
    );
  }

  return { workoutId: workout.id, workoutExerciseId: workoutExercise.id };
}
