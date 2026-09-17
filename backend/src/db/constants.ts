// Short codes stored in the DB / sent via API to minimise payload size.
// Map key = DB/API value, value.label = human-readable label for the UI layer.

export const SEX = new Map([
  ["M", { id: "M", label: "Male" }],
  ["F", { id: "F", label: "Female" }],
  ["O", { id: "O", label: "Other" }],
  ["P", { id: "P", label: "Prefer not to say" }],
] as const);
export type Sex = Parameters<typeof SEX.get>[0];
export const SEX_VALUES = [...SEX.keys()] as [Sex, ...Sex[]];

export const THEME = new Map([
  ["L", { id: "L", label: "Light" }],
  ["D", { id: "D", label: "Dark" }],
  ["S", { id: "S", label: "System" }],
] as const);
export type Theme = Parameters<typeof THEME.get>[0];
export const THEME_VALUES = [...THEME.keys()] as [Theme, ...Theme[]];

export const SET_TYPE = new Map([
  ["NO", { id: "NO", label: "Normal" }],
  ["WU", { id: "WU", label: "Warm-up" }],
  ["DP", { id: "DP", label: "Drop set" }],
  ["FA", { id: "FA", label: "Failure" }],
] as const);
export type SetType = Parameters<typeof SET_TYPE.get>[0];
export const SET_TYPE_VALUES = [...SET_TYPE.keys()] as [SetType, ...SetType[]];

export const FORMULA_1RM = new Map([
  ["EP", { id: "EP", label: "Epley" }],
  ["BR", { id: "BR", label: "Brzycki" }],
] as const);
export type Formula1rm = Parameters<typeof FORMULA_1RM.get>[0];
export const FORMULA_1RM_VALUES = [...FORMULA_1RM.keys()] as [Formula1rm, ...Formula1rm[]];

export const PR_TYPE = new Map([
  ["RM", { id: "RM", label: "1-Rep Max" }],
  ["WT", { id: "WT", label: "Weight" }],
  ["VO", { id: "VO", label: "Volume" }],
  ["RP", { id: "RP", label: "Reps" }],
] as const);
export type PrType = Parameters<typeof PR_TYPE.get>[0];
export const PR_TYPE_VALUES = [...PR_TYPE.keys()] as [PrType, ...PrType[]];
