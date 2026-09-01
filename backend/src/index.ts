import { Hono } from "hono";

export type Env = {
  Bindings: {
    DB: D1Database;
  };
};

const app = new Hono<Env>();

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

export default app;
