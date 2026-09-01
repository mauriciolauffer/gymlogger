import { Hono } from "hono";
import type { Env } from "../index";
import { authMiddleware } from "../middleware/auth";

export const workoutTemplatesRouter = new Hono<Env>();

workoutTemplatesRouter.use("*", authMiddleware);

// GET /api/v1/workout-templates
workoutTemplatesRouter.get("/", async (c) => {
  const user = c.get("user")!;

  const { results: templates } = await c.env.DB.prepare(
    `SELECT * FROM workout_templates WHERE user_id = ? ORDER BY updated_at DESC`,
  )
    .bind(user.userId)
    .all<any>();

  for (const t of templates) {
    const { results: exercises } = await c.env.DB.prepare(
      `SELECT wte.*, e.name as exercise_name, e.category, e.equipment
       FROM workout_template_exercises wte
       JOIN exercises e ON wte.exercise_id = e.id
       WHERE wte.template_id = ?
       ORDER BY wte.order_index ASC`,
    )
      .bind(t.id)
      .all();
    t.exercises = exercises;
  }

  return c.json({ templates });
});

// GET /api/v1/workout-templates/:id
workoutTemplatesRouter.get("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const template = await c.env.DB.prepare(
    "SELECT * FROM workout_templates WHERE id = ? AND user_id = ?",
  )
    .bind(id, user.userId)
    .first<any>();

  if (!template) {
    return c.json({ error: "Workout template not found" }, 404);
  }

  const { results: exercises } = await c.env.DB.prepare(
    `SELECT wte.*, e.name as exercise_name, e.category, e.equipment
     FROM workout_template_exercises wte
     JOIN exercises e ON wte.exercise_id = e.id
     WHERE wte.template_id = ?
     ORDER BY wte.order_index ASC`,
  )
    .bind(id)
    .all();

  return c.json({ template: { ...template, exercises } });
});

// POST /api/v1/workout-templates
workoutTemplatesRouter.post("/", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json().catch(() => null);

  if (!body || !body.title) {
    return c.json({ error: "Title is required" }, 400);
  }

  const { title, notes, exercises } = body;
  const templateId = `wt_${crypto.randomUUID()}`;

  await c.env.DB.prepare(
    `INSERT INTO workout_templates (id, user_id, title, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  )
    .bind(templateId, user.userId, title, notes ?? null)
    .run();

  if (Array.isArray(exercises)) {
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const wteId = `wte_${crypto.randomUUID()}`;
      const orderIdx = ex.order_index !== undefined ? ex.order_index : i;

      await c.env.DB.prepare(
        `INSERT INTO workout_template_exercises (id, template_id, exercise_id, superset_id, notes, order_index)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(wteId, templateId, ex.exercise_id, ex.superset_id ?? null, ex.notes ?? null, orderIdx)
        .run();
    }
  }

  const template = await c.env.DB.prepare("SELECT * FROM workout_templates WHERE id = ?")
    .bind(templateId)
    .first<any>();
  const { results: savedExercises } = await c.env.DB.prepare(
    "SELECT * FROM workout_template_exercises WHERE template_id = ? ORDER BY order_index ASC",
  )
    .bind(templateId)
    .all();

  return c.json(
    { message: "Workout template created", template: { ...template, exercises: savedExercises } },
    201,
  );
});

// PUT /api/v1/workout-templates/:id
workoutTemplatesRouter.put("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  const template = await c.env.DB.prepare(
    "SELECT id FROM workout_templates WHERE id = ? AND user_id = ?",
  )
    .bind(id, user.userId)
    .first();

  if (!template) {
    return c.json({ error: "Workout template not found or unauthorized" }, 404);
  }

  const { title, notes, exercises } = body;

  await c.env.DB.prepare(
    `UPDATE workout_templates
     SET title = COALESCE(?, title),
         notes = COALESCE(?, notes),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  )
    .bind(title ?? null, notes ?? null, id)
    .run();

  if (Array.isArray(exercises)) {
    await c.env.DB.prepare("DELETE FROM workout_template_exercises WHERE template_id = ?")
      .bind(id)
      .run();

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const wteId = `wte_${crypto.randomUUID()}`;
      const orderIdx = ex.order_index !== undefined ? ex.order_index : i;

      await c.env.DB.prepare(
        `INSERT INTO workout_template_exercises (id, template_id, exercise_id, superset_id, notes, order_index)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(wteId, id, ex.exercise_id, ex.superset_id ?? null, ex.notes ?? null, orderIdx)
        .run();
    }
  }

  const updatedTemplate = await c.env.DB.prepare("SELECT * FROM workout_templates WHERE id = ?")
    .bind(id)
    .first<any>();
  const { results: updatedExercises } = await c.env.DB.prepare(
    "SELECT * FROM workout_template_exercises WHERE template_id = ? ORDER BY order_index ASC",
  )
    .bind(id)
    .all();

  return c.json({
    message: "Workout template updated",
    template: { ...updatedTemplate, exercises: updatedExercises },
  });
});

// DELETE /api/v1/workout-templates/:id
workoutTemplatesRouter.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const template = await c.env.DB.prepare(
    "SELECT id FROM workout_templates WHERE id = ? AND user_id = ?",
  )
    .bind(id, user.userId)
    .first();

  if (!template) {
    return c.json({ error: "Workout template not found or unauthorized" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM workout_templates WHERE id = ?").bind(id).run();
  return c.json({ message: "Workout template deleted" });
});
