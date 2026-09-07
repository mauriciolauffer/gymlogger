import { describe, expect, it } from "vitest";
import { calculate1RM } from "../src/utils/calculator";
import { convertWeight, convertLength } from "../src/utils/unit-converter";

describe("calculate1RM", () => {
  it("returns 0 when reps <= 0", () => {
    expect(calculate1RM(100, 0)).toBe(0);
    expect(calculate1RM(100, -1)).toBe(0);
  });

  it("returns 0 when weight <= 0", () => {
    expect(calculate1RM(0, 5)).toBe(0);
    expect(calculate1RM(-10, 5)).toBe(0);
  });

  it("returns weight when reps === 1", () => {
    expect(calculate1RM(100, 1)).toBe(100);
    expect(calculate1RM(140, 1, "brzycki")).toBe(140);
  });

  it("epley formula (default)", () => {
    expect(calculate1RM(100, 5)).toBe(Math.round(100 * (1 + 5 / 30) * 10) / 10);
    expect(calculate1RM(80, 10)).toBe(Math.round(80 * (1 + 10 / 30) * 10) / 10);
  });

  it("brzycki formula", () => {
    expect(calculate1RM(100, 5, "brzycki")).toBe(Math.round(100 * (36 / (37 - 5)) * 10) / 10);
  });

  it("brzycki returns weight when reps >= 37", () => {
    expect(calculate1RM(100, 37, "brzycki")).toBe(100);
    expect(calculate1RM(100, 40, "brzycki")).toBe(100);
  });
});

describe("convertWeight", () => {
  it("returns null for null/undefined input", () => {
    expect(convertWeight(null, "kg", "lbs")).toBeNull();
    expect(convertWeight(undefined, "kg", "lbs")).toBeNull();
  });

  it("returns same value when units match", () => {
    expect(convertWeight(100, "kg", "kg")).toBe(100);
  });

  it("converts kg to lbs", () => {
    expect(convertWeight(100, "kg", "lbs")).toBe(Math.round(100 * 2.20462 * 10) / 10);
  });

  it("converts lbs to kg", () => {
    expect(convertWeight(220, "lbs", "kg")).toBe(Math.round((220 / 2.20462) * 10) / 10);
  });

  it("returns value unchanged for unknown unit pair", () => {
    expect(convertWeight(100, "kg", "stone")).toBe(100);
  });
});

describe("convertLength", () => {
  it("returns null for null/undefined input", () => {
    expect(convertLength(null, "cm", "in")).toBeNull();
    expect(convertLength(undefined, "cm", "in")).toBeNull();
  });

  it("returns same value when units match", () => {
    expect(convertLength(180, "cm", "cm")).toBe(180);
  });

  it("converts cm to in", () => {
    expect(convertLength(180, "cm", "in")).toBe(Math.round((180 / 2.54) * 10) / 10);
  });

  it("converts in to cm", () => {
    expect(convertLength(70, "in", "cm")).toBe(Math.round(70 * 2.54 * 10) / 10);
  });

  it("returns value unchanged for unknown unit pair", () => {
    expect(convertLength(180, "cm", "m")).toBe(180);
  });
});
