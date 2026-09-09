import { Hono } from "hono";
import type { Env } from "../index";
import { authRouter } from "./auth";

const publicRoutes = new Hono<Env>();

publicRoutes.route("/api/v1/auth", authRouter);

export { publicRoutes };
