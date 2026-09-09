import { Hono } from "hono";
import { eq, and, like, or, SQL } from "drizzle-orm";
import type { Env } from "../index";
import { getDb } from "../db/schema";
import { exercises, muscleGroups, exerciseSecondaryMuscles } from "../db/schema";

export const exercisesRouter = new Hono<Env>()
  .get("/muscle-groups", async (c) => {
    const db = getDb(c);
    const results = await db
      .select({ id: muscleGroups.id, name: muscleGroups.name })
      .from(muscleGroups)
      .orderBy(muscleGroups.name)
      .all();
    return c.json({ muscleGroups: results });
  });

exercisesRouter.get("/exercises", async (c) => {
  const user = c.get("user")!;
  const { q, category, bodyPart, equipment, target, muscleGroupId, custom } = c.req.query();
  const db = getDb(c);

  const conditions: SQL[] = [or(eq(exercises.isCustom, false), eq(exercises.userId, user.userId))!];

  if (custom === "true") {
    conditions.push(eq(exercises.isCustom, true));
    conditions.push(eq(exercises.userId, user.userId));
  }
  if (q) conditions.push(like(exercises.name, `%${q}%`));
  if (category) conditions.push(eq(exercises.category, category));
  if (bodyPart) conditions.push(eq(exercises.bodyPart, bodyPart));
  if (equipment) conditions.push(eq(exercises.equipment, equipment));
  if (target) conditions.push(eq(exercises.target, target));
  if (muscleGroupId) conditions.push(eq(exercises.muscleGroupId, muscleGroupId));

  const results = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      category: exercises.category,
      bodyPart: exercises.bodyPart,
      equipment: exercises.equipment,
      instructions: exercises.instructions,
      instructionSteps: exercises.instructionSteps,
      muscleGroupId: exercises.muscleGroupId,
      target: exercises.target,
      mediaId: exercises.mediaId,
      image: exercises.image,
      gifUrl: exercises.gifUrl,
      attribution: exercises.attribution,
      isCustom: exercises.isCustom,
      userId: exercises.userId,
      createdAt: exercises.createdAt,
      muscleGroupName: muscleGroups.name,
    })
    .from(exercises)
    .leftJoin(muscleGroups, eq(exercises.muscleGroupId, muscleGroups.id))
    .where(and(...conditions))
    .orderBy(exercises.name)
    .limit(500)
    .all();

  return c.json({ exercises: results });
});

exercisesRouter.get("/exercises/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const db = getDb(c);

  const exercise = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      category: exercises.category,
      bodyPart: exercises.bodyPart,
      equipment: exercises.equipment,
      instructions: exercises.instructions,
      instructionSteps: exercises.instructionSteps,
      muscleGroupId: exercises.muscleGroupId,
      target: exercises.target,
      mediaId: exercises.mediaId,
      image: exercises.image,
      gifUrl: exercises.gifUrl,
      attribution: exercises.attribution,
      isCustom: exercises.isCustom,
      userId: exercises.userId,
      createdAt: exercises.createdAt,
      muscleGroupName: muscleGroups.name,
    })
    .from(exercises)
    .leftJoin(muscleGroups, eq(exercises.muscleGroupId, muscleGroups.id))
    .where(
      and(
        eq(exercises.id, id),
        or(eq(exercises.isCustom, false), eq(exercises.userId, user.userId)),
      ),
    )
    .get();

  if (!exercise) {
    return c.json({ error: "Exercise not found" }, 404);
  }

  const secondaryMuscles = await db
    .select({ id: muscleGroups.id, name: muscleGroups.name })
    .from(exerciseSecondaryMuscles)
    .innerJoin(muscleGroups, eq(exerciseSecondaryMuscles.muscleGroupId, muscleGroups.id))
    .where(eq(exerciseSecondaryMuscles.exerciseId, id))
    .all();

  return c.json({ exercise: { ...exercise, secondaryMuscles } });
});

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
  const db = getDb(c);

  await db
    .insert(exercises)
    .values({
      id,
      name,
      category,
      bodyPart: body_part,
      equipment: equipment ?? null,
      instructions: instructions ?? null,
      instructionSteps: instruction_steps ? JSON.stringify(instruction_steps) : null,
      muscleGroupId: muscle_group_id ?? null,
      target: target ?? null,
      isCustom: true,
      userId: user.userId,
    })
    .run();

  if (Array.isArray(secondary_muscle_ids)) {
    await Promise.all(
      secondary_muscle_ids.map((mgId: string) =>
        db
          .insert(exerciseSecondaryMuscles)
          .values({ exerciseId: id, muscleGroupId: mgId })
          .onConflictDoNothing()
          .run(),
      ),
    );
  }

  const newExercise = await db.select().from(exercises).where(eq(exercises.id, id)).get();
  return c.json({ message: "Custom exercise created", exercise: newExercise }, 201);
});

exercisesRouter.put("/exercises/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const db = getDb(c);

  const existing = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(
      and(eq(exercises.id, id), eq(exercises.userId, user.userId), eq(exercises.isCustom, true)),
    )
    .get();

  if (!existing) {
    return c.json({ error: "Custom exercise not found or unauthorized" }, 404);
  }

  if (!body) {
    return c.json({ error: "Invalid JSON body" }, 400);
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

  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (category !== undefined) patch.category = category;
  if (body_part !== undefined) patch.bodyPart = body_part;
  if (equipment !== undefined) patch.equipment = equipment;
  if (instructions !== undefined) patch.instructions = instructions;
  if (instruction_steps !== undefined) patch.instructionSteps = JSON.stringify(instruction_steps);
  if (muscle_group_id !== undefined) patch.muscleGroupId = muscle_group_id;
  if (target !== undefined) patch.target = target;

  if (Object.keys(patch).length > 0) {
    await db.update(exercises).set(patch).where(eq(exercises.id, id)).run();
  }

  if (Array.isArray(secondary_muscle_ids)) {
    await db
      .delete(exerciseSecondaryMuscles)
      .where(eq(exerciseSecondaryMuscles.exerciseId, id))
      .run();
    await Promise.all(
      secondary_muscle_ids.map((mgId: string) =>
        db
          .insert(exerciseSecondaryMuscles)
          .values({ exerciseId: id, muscleGroupId: mgId })
          .onConflictDoNothing()
          .run(),
      ),
    );
  }

  const updated = await db.select().from(exercises).where(eq(exercises.id, id)).get();
  return c.json({ message: "Custom exercise updated", exercise: updated });
});

exercisesRouter.delete("/exercises/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const db = getDb(c);

  const existing = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(
      and(eq(exercises.id, id), eq(exercises.userId, user.userId), eq(exercises.isCustom, true)),
    )
    .get();

  if (!existing) {
    return c.json({ error: "Custom exercise not found or unauthorized" }, 404);
  }

  await db.delete(exercises).where(eq(exercises.id, id)).run();
  return c.json({ message: "Custom exercise deleted" });
});
