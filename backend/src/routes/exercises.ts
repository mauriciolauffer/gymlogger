import { Hono } from "hono";
import type { Env } from "../index";
import { authMiddleware } from "../middleware/auth";

export const exercisesRouter = new Hono<Env>();

// GET /api/v1/muscle-groups
exercisesRouter.get("/muscle-groups", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name FROM muscle_groups ORDER BY name ASC",
  ).all();
  return c.json({ muscleGroups: results });
});

// Protected exercise routes
exercisesRouter.use("/exercises/*", authMiddleware);
exercisesRouter.use("/exercises", authMiddleware);

// GET /api/v1/exercises
exercisesRouter.get("/exercises", async (c) => {
  const user = c.get("user")!;
  const { q, category, bodyPart, equipment, target, muscleGroupId, custom } = c.req.query();

  let query = `
    SELECT e.*, mg.name as muscle_group_name
    FROM exercises e
    LEFT JOIN muscle_groups mg ON e.muscle_group_id = mg.id
    WHERE (e.is_custom = FALSE OR e.user_id = ?)
  `;
  const params: any[] = [user.userId];

  if (custom === "true") {
    query += ` AND e.is_custom = TRUE AND e.user_id = ?`;
    params.push(user.userId);
  }

  if (q) {
    query += ` AND e.name LIKE ?`;
    params.push(`%${q}%`);
  }

  if (category) {
    query += ` AND e.category = ?`;
    params.push(category);
  }

  if (bodyPart) {
    query += ` AND e.body_part = ?`;
    params.push(bodyPart);
  }

  if (equipment) {
    query += ` AND e.equipment = ?`;
    params.push(equipment);
  }

  if (target) {
    query += ` AND e.target = ?`;
    params.push(target);
  }

  if (muscleGroupId) {
    query += ` AND e.muscle_group_id = ?`;
    params.push(muscleGroupId);
  }

  query += ` ORDER BY e.name ASC`;

  const { results } = await c.env.DB.prepare(query)
    .bind(...params)
    .all();
  return c.json({ exercises: results });
});

// GET /api/v1/exercises/:id
exercisesRouter.get("/exercises/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const exercise = await c.env.DB.prepare(
    `SELECT e.*, mg.name as muscle_group_name
     FROM exercises e
     LEFT JOIN muscle_groups mg ON e.muscle_group_id = mg.id
     WHERE e.id = ? AND (e.is_custom = FALSE OR e.user_id = ?)`,
  )
    .bind(id, user.userId)
    .first();

  if (!exercise) {
    return c.json({ error: "Exercise not found" }, 404);
  }

  // Fetch secondary muscles
  const { results: secondaryMuscles } = await c.env.DB.prepare(
    `SELECT mg.id, mg.name
     FROM exercise_secondary_muscles esm
     JOIN muscle_groups mg ON esm.muscle_group_id = mg.id
     WHERE esm.exercise_id = ?`,
  )
    .bind(id)
    .all();

  return c.json({ exercise: { ...exercise, secondaryMuscles } });
});

// POST /api/v1/exercises (Custom exercise creation)
exercisesRouter.post("/exercises", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json().catch(() => null);

  if (!body || !body.name || !body.category || !body.body_part) {
    return c.json({ error: "Name, category, and body_part are required" }, 400);
  }

  const {
    name,
    category,
    body_part,
    equipment,
    instructions,
    instruction_steps,
    muscle_group_id,
    target,
    secondary_muscle_ids,
  } = body;

  const id = `custom_${crypto.randomUUID()}`;

  await c.env.DB.prepare(
    `INSERT INTO exercises (
      id, name, category, body_part, equipment, instructions, instruction_steps,
      muscle_group_id, target, is_custom, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
  )
    .bind(
      id,
      name,
      category,
      body_part,
      equipment ?? null,
      instructions ?? null,
      instruction_steps ? JSON.stringify(instruction_steps) : null,
      muscle_group_id ?? null,
      target ?? null,
      user.userId,
    )
    .run();

  if (Array.isArray(secondary_muscle_ids)) {
    for (const mgId of secondary_muscle_ids) {
      await c.env.DB.prepare(
        "INSERT OR IGNORE INTO exercise_secondary_muscles (exercise_id, muscle_group_id) VALUES (?, ?)",
      )
        .bind(id, mgId)
        .run();
    }
  }

  const newExercise = await c.env.DB.prepare("SELECT * FROM exercises WHERE id = ?")
    .bind(id)
    .first();
  return c.json({ message: "Custom exercise created", exercise: newExercise }, 201);
});

// PUT /api/v1/exercises/:id
exercisesRouter.put("/exercises/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  const existing = await c.env.DB.prepare(
    "SELECT * FROM exercises WHERE id = ? AND user_id = ? AND is_custom = TRUE",
  )
    .bind(id, user.userId)
    .first();

  if (!existing) {
    return c.json({ error: "Custom exercise not found or unauthorized" }, 404);
  }

  const {
    name,
    category,
    body_part,
    equipment,
    instructions,
    instruction_steps,
    muscle_group_id,
    target,
    secondary_muscle_ids,
  } = body;

  await c.env.DB.prepare(
    `UPDATE exercises
     SET name = COALESCE(?, name),
         category = COALESCE(?, category),
         body_part = COALESCE(?, body_part),
         equipment = COALESCE(?, equipment),
         instructions = COALESCE(?, instructions),
         instruction_steps = COALESCE(?, instruction_steps),
         muscle_group_id = COALESCE(?, muscle_group_id),
         target = COALESCE(?, target)
     WHERE id = ? AND user_id = ?`,
  )
    .bind(
      name ?? null,
      category ?? null,
      body_part ?? null,
      equipment ?? null,
      instructions ?? null,
      instruction_steps ? JSON.stringify(instruction_steps) : null,
      muscle_group_id ?? null,
      target ?? null,
      id,
      user.userId,
    )
    .run();

  if (Array.isArray(secondary_muscle_ids)) {
    await c.env.DB.prepare("DELETE FROM exercise_secondary_muscles WHERE exercise_id = ?")
      .bind(id)
      .run();
    for (const mgId of secondary_muscle_ids) {
      await c.env.DB.prepare(
        "INSERT OR IGNORE INTO exercise_secondary_muscles (exercise_id, muscle_group_id) VALUES (?, ?)",
      )
        .bind(id, mgId)
        .run();
    }
  }

  const updated = await c.env.DB.prepare("SELECT * FROM exercises WHERE id = ?").bind(id).first();
  return c.json({ message: "Custom exercise updated", exercise: updated });
});

// DELETE /api/v1/exercises/:id
exercisesRouter.delete("/exercises/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const existing = await c.env.DB.prepare(
    "SELECT id FROM exercises WHERE id = ? AND user_id = ? AND is_custom = TRUE",
  )
    .bind(id, user.userId)
    .first();

  if (!existing) {
    return c.json({ error: "Custom exercise not found or unauthorized" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM exercises WHERE id = ?").bind(id).run();
  return c.json({ message: "Custom exercise deleted" });
});
