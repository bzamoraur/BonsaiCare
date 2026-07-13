import { describe, expect, it } from "vitest";

import { isFirstStep, isLastStep, nextStep, prevStep, shouldShowTour, TOUR_STEPS } from "./tour";

describe("tour steps", () => {
  it("has the three core steps in learning order", () => {
    expect(TOUR_STEPS).toEqual(["addTree", "logCare", "timeline"]);
  });
});

describe("shouldShowTour", () => {
  it("shows the tour when the flag is null (never dismissed)", () => {
    expect(shouldShowTour(null)).toBe(true);
  });

  it("hides the tour once dismissed (any timestamp)", () => {
    expect(shouldShowTour("2026-07-13T10:00:00.000Z")).toBe(false);
    // Even a falsy-looking but non-null string counts as seen.
    expect(shouldShowTour("")).toBe(false);
  });
});

describe("step navigation", () => {
  const last = TOUR_STEPS.length - 1;

  it("identifies the first and last steps", () => {
    expect(isFirstStep(0)).toBe(true);
    expect(isFirstStep(1)).toBe(false);
    expect(isLastStep(last)).toBe(true);
    expect(isLastStep(0)).toBe(false);
  });

  it("advances and clamps at the last step", () => {
    expect(nextStep(0)).toBe(1);
    expect(nextStep(1)).toBe(2);
    expect(nextStep(last)).toBe(last);
  });

  it("goes back and clamps at the first step", () => {
    expect(prevStep(last)).toBe(last - 1);
    expect(prevStep(1)).toBe(0);
    expect(prevStep(0)).toBe(0);
  });

  it("round-trips next→prev within bounds", () => {
    expect(prevStep(nextStep(1))).toBe(1);
  });
});
