import { env } from "cloudflare:test";
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

export async function loginUser(
  email: string,
  password: string,
): Promise<{ token: string }> {
  const res = await app.request(
    "/api/auth/sign-in/email",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
    env,
  );
  const token = res.headers.get("set-auth-token") ?? "";
  return { token };
}
