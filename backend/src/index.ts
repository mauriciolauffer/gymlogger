import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { publicRoutes } from "./routes/public";
import { privateRoutes } from "./routes/private";

export type Env = {
  Bindings: {
    DB: D1Database;
    JWT_SECRET: string;
    APP_BASE_URL: string;
    CORS_ORIGIN: string;
  };
  Variables: {
    user?: { userId: string; email: string };
  };
};

const app = new Hono<Env>();

app.use("*", requestId());
app.use("*", secureHeaders());

const routes = app.route("/", publicRoutes).route("/", privateRoutes);

app.notFound((c) => {
  return c.json({ error: "Endpoint not found" }, 404);
});

app.onError((err, c) => {
  console.error("Unhandled Application Error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
export type AppType = typeof routes;
