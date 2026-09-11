import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { structuredLogger, type StructuredLoggerEnv } from "@hono/structured-logger";
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
} & StructuredLoggerEnv<Console>;

const app = new Hono<Env>();

app.use(requestId());
app.use(secureHeaders());
app.use(
  structuredLogger({
    createLogger: () => console,
    onResponse: (_logger, c, elapsedMs) =>
      console.info(c.req.method, c.req.path, c.res.status, `${elapsedMs}ms`),
    onError: (_logger, err, c, elapsedMs) =>
      console.error(c.req.method, c.req.path, `${elapsedMs}ms`, err),
  }),
);

const routes = app.route("/", publicRoutes).route("/", privateRoutes);

app.notFound((c) => {
  return c.json({ error: "Endpoint not found" }, 404);
});

app.onError((_err, c) => {
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
export type AppType = typeof routes;
