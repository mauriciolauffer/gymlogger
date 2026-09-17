import type { Formula1rm } from "../db/constants";

export function calculate1RM(weight: number, reps: number, formula: Formula1rm = "EP"): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  if (formula === "BR") {
    if (reps >= 37) return weight;
    return Math.round(weight * (36 / (37 - reps)) * 10) / 10;
  }
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}
