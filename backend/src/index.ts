import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from 'hono/request-id'
import { secureHeaders } from "hono/secure-headers";
import { createAuth } from "./lib/auth";
import { publicRoutes } from "./routes/public";
import { privateRoutes } from "./routes/private";

export type Env = {
  Bindings: {
    DB: D1Database;
    JWT_SECRET?: string;
    APP_BASE_URL?: string;
    CORS_ORIGIN?: string;
  };
  Variables: {
    user?: { userId: string; email: string };
  };
};

const app = new Hono<Env>();

app.use('*', requestId())

// Built-in Middleware for security & CORS
app.use("*", secureHeaders());
app.use("*", async (c, next) => {
  return cors({
    origin: c.env.CORS_ORIGIN ?? "http://localhost:5173",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })(c, next);
});

// Health check endpoints
app.get("/", (c) => {
  return c.json({
    name: "GymLogger API",
    status: "ok",
    version: "0.1.0",
  });
});

app.get("/health", (c) => {
  return c.json({ status: "healthy" });
});

// Mount Better Auth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return createAuth(c.env.DB, c.env.JWT_SECRET, c.env.APP_BASE_URL).handler(c.req.raw);
});

// Mount API routes
const routes = app
  .route("/", publicRoutes)
  .route("/", privateRoutes);

// Global Not Found handler
app.notFound((c) => {
  return c.json({ error: "Endpoint not found" }, 404);
});

// Global Error handler
app.onError((err, c) => {
  console.error("Unhandled Application Error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
export type AppType = typeof routes;
