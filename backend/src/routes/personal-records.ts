import { Hono } from "hono";
import type { Env } from "../index";
import { authMiddleware } from "../middleware/auth";

export const personalRecordsRouter = new Hono<Env>();

personalRecordsRouter.use("*", authMiddleware);

// GET /api/v1/personal-records
personalRecordsRouter.get("/", async (c) => {
  const user = c.get("user")!;
  const exerciseId = c.req.query("exerciseId");

  let query = `
    SELECT pr.*, e.name as exercise_name
    FROM personal_records pr
    JOIN exercises e ON pr.exercise_id = e.id
    WHERE pr.user_id = ?
  `;
  const params: any[] = [user.userId];

  if (exerciseId) {
    query += ` AND pr.exercise_id = ?`;
    params.push(exerciseId);
  }

  query += ` ORDER BY pr.achieved_at DESC`;

  const { results: personalRecords } = await c.env.DB.prepare(query)
    .bind(...params)
    .all();
  return c.json({ personalRecords });
});
