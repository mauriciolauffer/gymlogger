import { testClient } from "hono/testing";
import { env } from "cloudflare:workers";
import app from "../src/index.ts";
import type { AppType } from "../src/index.ts";

export function createClient() {
  return testClient<AppType>(app, env);
}

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
  const client = createClient();

  const wRes = await client.api.v1.workouts.start.$post(
    {
      json: {
        title: opts?.title ?? "Workout",
        ...(opts?.start_time && { start_time: opts.start_time }),
      },
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const { workout } = await wRes.json<{ workout: { id: string } }>();

  const exRes = await client.api.v1.workouts[":id"].exercises.$post(
    { param: { id: workout.id }, json: { exercise_id: exerciseId } },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const { workoutExercise } = await exRes.json<{ workoutExercise: { id: string } }>();

  const requests = [];
  for (const s of sets) {
    requests.push(
      client.api.v1.workouts[":id"].sets.$post(
        { param: { id: workout.id }, json: { workout_exercise_id: workoutExercise.id, ...s } },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    );
  }
  await Promise.all(requests);

  return { workoutId: workout.id, workoutExerciseId: workoutExercise.id };
}
