import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, desc, asc } from "drizzle-orm";
import type { Env } from "../index";
import { getDb } from "../db/schema";
import { workoutTemplates, workoutTemplateExercises, exercises } from "../db/schema";
import {
  createWorkoutTemplateSchema,
  updateWorkoutTemplateBodySchema,
} from "../validation/schemas";

export const workoutTemplatesRouter = new Hono<Env>()
  .get("/", async (c) => {
    const user = c.get("user")!;
    const db = getDb(c);

    const templates = await db
      .select()
      .from(workoutTemplates)
      .where(eq(workoutTemplates.userId, user.userId))
      .orderBy(desc(workoutTemplates.updatedAt))
      .all();

    const templatesWithExercises = await Promise.all(
      templates.map(async (t) => {
        const templateExercises = await db
          .select({
            id: workoutTemplateExercises.id,
            templateId: workoutTemplateExercises.templateId,
            exerciseId: workoutTemplateExercises.exerciseId,
            supersetId: workoutTemplateExercises.supersetId,
            notes: workoutTemplateExercises.notes,
            orderIndex: workoutTemplateExercises.orderIndex,
            exerciseName: exercises.name,
            category: exercises.category,
            equipment: exercises.equipment,
          })
          .from(workoutTemplateExercises)
          .innerJoin(exercises, eq(workoutTemplateExercises.exerciseId, exercises.id))
          .where(eq(workoutTemplateExercises.templateId, t.id))
          .orderBy(asc(workoutTemplateExercises.orderIndex))
          .all();
        return Object.assign({}, t, { exercises: templateExercises });
      }),
    );

    return c.json({ templates: templatesWithExercises });
  })
  .get("/:id", async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");
    const db = getDb(c);

    const template = await db
      .select()
      .from(workoutTemplates)
      .where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, user.userId)))
      .get();

    if (!template) {
      return c.json({ error: "Workout template not found" }, 404);
    }

    const templateExercises = await db
      .select({
        id: workoutTemplateExercises.id,
        templateId: workoutTemplateExercises.templateId,
        exerciseId: workoutTemplateExercises.exerciseId,
        supersetId: workoutTemplateExercises.supersetId,
        notes: workoutTemplateExercises.notes,
        orderIndex: workoutTemplateExercises.orderIndex,
        exerciseName: exercises.name,
        category: exercises.category,
        equipment: exercises.equipment,
      })
      .from(workoutTemplateExercises)
      .innerJoin(exercises, eq(workoutTemplateExercises.exerciseId, exercises.id))
      .where(eq(workoutTemplateExercises.templateId, id))
      .orderBy(asc(workoutTemplateExercises.orderIndex))
      .all();

    return c.json({ template: { ...template, exercises: templateExercises } });
  })
  .post("/", zValidator("json", createWorkoutTemplateSchema), async (c) => {
    const user = c.get("user")!;
    const body = c.req.valid("json");

    const { title, notes, exercises: bodyExercises } = body;
    const templateId = `wt_${crypto.randomUUID()}`;
    const now = new Date();
    const db = getDb(c);

    await db
      .insert(workoutTemplates)
      .values({
        id: templateId,
        userId: user.userId,
        title,
        notes: notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    if (Array.isArray(bodyExercises)) {
      await Promise.all(
        bodyExercises.map((ex, i) => {
          const wteId = `wte_${crypto.randomUUID()}`;
          const orderIdx = ex.order_index !== undefined ? ex.order_index : i;
          return db
            .insert(workoutTemplateExercises)
            .values({
              id: wteId,
              templateId,
              exerciseId: ex.exercise_id,
              supersetId: ex.superset_id ?? null,
              notes: ex.notes ?? null,
              orderIndex: orderIdx,
            })
            .run();
        }),
      );
    }

    const template = await db
      .select()
      .from(workoutTemplates)
      .where(eq(workoutTemplates.id, templateId))
      .get();
    const savedExercises = await db
      .select()
      .from(workoutTemplateExercises)
      .where(eq(workoutTemplateExercises.templateId, templateId))
      .orderBy(asc(workoutTemplateExercises.orderIndex))
      .all();

    return c.json(
      { message: "Workout template created", template: { ...template, exercises: savedExercises } },
      201,
    );
  })
  .put("/:id", zValidator("json", updateWorkoutTemplateBodySchema), async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const db = getDb(c);

    const template = await db
      .select({ id: workoutTemplates.id })
      .from(workoutTemplates)
      .where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, user.userId)))
      .get();

    if (!template) {
      return c.json({ error: "Workout template not found or unauthorized" }, 404);
    }

    const { title, notes, exercises: bodyExercises } = body;

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) patch.title = title;
    if (notes !== undefined) patch.notes = notes;

    await db.update(workoutTemplates).set(patch).where(eq(workoutTemplates.id, id)).run();

    if (Array.isArray(bodyExercises)) {
      await db
        .delete(workoutTemplateExercises)
        .where(eq(workoutTemplateExercises.templateId, id))
        .run();

      await Promise.all(
        bodyExercises.map((ex, i) => {
          const wteId = `wte_${crypto.randomUUID()}`;
          const orderIdx = ex.order_index !== undefined ? ex.order_index : i;
          return db
            .insert(workoutTemplateExercises)
            .values({
              id: wteId,
              templateId: id,
              exerciseId: ex.exercise_id,
              supersetId: ex.superset_id ?? null,
              notes: ex.notes ?? null,
              orderIndex: orderIdx,
            })
            .run();
        }),
      );
    }

    const updatedTemplate = await db
      .select()
      .from(workoutTemplates)
      .where(eq(workoutTemplates.id, id))
      .get();
    const updatedExercises = await db
      .select()
      .from(workoutTemplateExercises)
      .where(eq(workoutTemplateExercises.templateId, id))
      .orderBy(asc(workoutTemplateExercises.orderIndex))
      .all();

    return c.json({
      message: "Workout template updated",
      template: { ...updatedTemplate, exercises: updatedExercises },
    });
  })
  .delete("/:id", async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");
    const db = getDb(c);

    const template = await db
      .select({ id: workoutTemplates.id })
      .from(workoutTemplates)
      .where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, user.userId)))
      .get();

    if (!template) {
      return c.json({ error: "Workout template not found or unauthorized" }, 404);
    }

    await db.delete(workoutTemplates).where(eq(workoutTemplates.id, id)).run();
    return c.json({ message: "Workout template deleted" });
  });
