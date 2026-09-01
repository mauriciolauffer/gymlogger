export function convertWeight(
  value: number | null | undefined,
  fromUnit: string,
  toUnit: string,
): number | null {
  if (value === null || value === undefined) return null;
  if (fromUnit === toUnit) return value;
  if (fromUnit === "kg" && toUnit === "lbs") return Math.round(value * 2.20462 * 10) / 10;
  if (fromUnit === "lbs" && toUnit === "kg") return Math.round((value / 2.20462) * 10) / 10;
  return value;
}

export function convertLength(
  value: number | null | undefined,
  fromUnit: string,
  toUnit: string,
): number | null {
  if (value === null || value === undefined) return null;
  if (fromUnit === toUnit) return value;
  if (fromUnit === "cm" && toUnit === "in") return Math.round((value / 2.54) * 10) / 10;
  if (fromUnit === "in" && toUnit === "cm") return Math.round(value * 2.54 * 10) / 10;
  return value;
}
