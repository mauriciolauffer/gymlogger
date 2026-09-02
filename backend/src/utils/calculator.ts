export function calculate1RM(
  weight: number,
  reps: number,
  formula: "epley" | "brzycki" = "epley",
): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  if (formula === "brzycki") {
    if (reps >= 37) return weight;
    return Math.round(weight * (36 / (37 - reps)) * 10) / 10;
  }
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}
