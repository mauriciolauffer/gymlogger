import { Hono } from "hono";
import type { Env } from "../index";
import { authMiddleware } from "../middleware/auth";

export const calculatorsRouter = new Hono<Env>();

calculatorsRouter.use("*", authMiddleware);

// GET /api/v1/calculators/warmup?targetWeight=:w
calculatorsRouter.get("/warmup", async (c) => {
  const targetWeightStr = c.req.query("targetWeight");
  const targetWeight = parseFloat(targetWeightStr || "0");

  if (isNaN(targetWeight) || targetWeight <= 0) {
    return c.json({ error: "targetWeight must be a positive number" }, 400);
  }

  const warmUpSets = [
    {
      percent: 40,
      weight: Math.round(targetWeight * 0.4 * 10) / 10,
      reps: 10,
      set_type: "warmup",
      notes: "Warm-up Set 1",
    },
    {
      percent: 60,
      weight: Math.round(targetWeight * 0.6 * 10) / 10,
      reps: 6,
      set_type: "warmup",
      notes: "Warm-up Set 2",
    },
    {
      percent: 80,
      weight: Math.round(targetWeight * 0.8 * 10) / 10,
      reps: 3,
      set_type: "warmup",
      notes: "Warm-up Set 3",
    },
  ];

  return c.json({
    targetWeight,
    warmUpSets,
  });
});
