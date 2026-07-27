import { describe, it, expect } from "vitest";
import {
  DEFAULT_QA_THRESHOLD,
  effectiveQaThreshold,
  qaScoreColor,
  qaVerdict,
} from "./qa-threshold";

describe("effectiveQaThreshold", () => {
  it("uses the template threshold when one is configured", () => {
    expect(effectiveQaThreshold(85)).toBe(85);
    expect(effectiveQaThreshold(0)).toBe(0);
  });

  it("falls back to the column default for null/undefined", () => {
    expect(effectiveQaThreshold(null)).toBe(DEFAULT_QA_THRESHOLD);
    expect(effectiveQaThreshold(undefined)).toBe(DEFAULT_QA_THRESHOLD);
  });

  it("falls back for NaN rather than propagating it", () => {
    expect(effectiveQaThreshold(Number.NaN)).toBe(DEFAULT_QA_THRESHOLD);
  });
});

describe("qaVerdict", () => {
  it("returns null when there is no score", () => {
    expect(qaVerdict(null, 70)).toBeNull();
    expect(qaVerdict(undefined, 70)).toBeNull();
  });

  it("respects a configured threshold instead of the old hardcoded 75", () => {
    // The whole point of the fix: 80 is a PASS at threshold 75 and a FAIL-band
    // warn at threshold 85. The previous hardcoded band called both a pass.
    expect(qaVerdict(80, 75)).toBe("pass");
    expect(qaVerdict(80, 85)).toBe("warn");
  });

  it("passes exactly at the threshold", () => {
    expect(qaVerdict(70, 70)).toBe("pass");
    expect(qaVerdict(69, 70)).toBe("warn");
  });

  it("reproduces the legacy 75/50 band when the threshold is 75", () => {
    expect(qaVerdict(75, 75)).toBe("pass");
    expect(qaVerdict(74, 75)).toBe("warn");
    expect(qaVerdict(50, 75)).toBe("warn");
    expect(qaVerdict(49, 75)).toBe("fail");
  });

  it("scales the warn band with the threshold", () => {
    // 90 * (50/75) = 60
    expect(qaVerdict(60, 90)).toBe("warn");
    expect(qaVerdict(59, 90)).toBe("fail");
  });

  it("uses the default threshold when none is supplied", () => {
    expect(qaVerdict(70)).toBe("pass");
    expect(qaVerdict(69)).toBe("warn");
  });
});

describe("qaScoreColor", () => {
  it("maps verdicts to the shared colour scale", () => {
    expect(qaScoreColor(90, 75)).toBe("text-green-600");
    expect(qaScoreColor(60, 75)).toBe("text-amber-600");
    expect(qaScoreColor(10, 75)).toBe("text-red-600");
  });

  it("is muted when there is no score", () => {
    expect(qaScoreColor(null, 75)).toBe("text-muted-foreground");
  });
});
