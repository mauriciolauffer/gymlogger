// Mirrors backend/src/db/constants.ts — keep in sync when backend codes change.
// Short codes stored in the DB / sent via API to minimise payload size.
// Map key = DB/API value, value.label = human-readable label for the UI layer.

export const SEX_VALUES = ["M", "F", "O", "P"] as const;
export type Sex = (typeof SEX_VALUES)[number];
export const SEX = new Map<Sex, { id: Sex; label: string }>([
  ["M", { id: "M", label: "Male" }],
  ["F", { id: "F", label: "Female" }],
  ["O", { id: "O", label: "Other" }],
  ["P", { id: "P", label: "Prefer not to say" }],
]);

export const THEME_VALUES = ["L", "D", "S"] as const;
export type Theme = (typeof THEME_VALUES)[number];
export const THEME = new Map<Theme, { id: Theme; label: string }>([
  ["L", { id: "L", label: "Light" }],
  ["D", { id: "D", label: "Dark" }],
  ["S", { id: "S", label: "System" }],
]);

export const SET_TYPE_VALUES = ["NO", "WU", "DP", "FA"] as const;
export type SetType = (typeof SET_TYPE_VALUES)[number];
export const SET_TYPE = new Map<SetType, { id: SetType; label: string }>([
  ["NO", { id: "NO", label: "Normal" }],
  ["WU", { id: "WU", label: "Warm-up" }],
  ["DP", { id: "DP", label: "Drop set" }],
  ["FA", { id: "FA", label: "Failure" }],
]);

export const FORMULA_1RM_VALUES = ["EP", "BR"] as const;
export type Formula1rm = (typeof FORMULA_1RM_VALUES)[number];
export const FORMULA_1RM = new Map<Formula1rm, { id: Formula1rm; label: string }>([
  ["EP", { id: "EP", label: "Epley" }],
  ["BR", { id: "BR", label: "Brzycki" }],
]);

export const PR_TYPE_VALUES = ["RM", "WT", "VO", "RP"] as const;
export type PrType = (typeof PR_TYPE_VALUES)[number];
export const PR_TYPE = new Map<PrType, { id: PrType; label: string }>([
  ["RM", { id: "RM", label: "1-Rep Max" }],
  ["WT", { id: "WT", label: "Weight" }],
  ["VO", { id: "VO", label: "Volume" }],
  ["RP", { id: "RP", label: "Reps" }],
]);
