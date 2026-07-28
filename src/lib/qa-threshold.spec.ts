import { describe, it, expect } from "vitest";
import {
  DEFAULT_QA_THRESHOLD,
  QA_WARN_FLOOR,
  effectiveQaThreshold,
  qaScoreColor,
  qaVerdict,
} from "./qa-threshold";

describe("effectiveQaThreshold", () => {
  it("uses the template threshold when one is configured", () => {
    expect(effectiveQaThreshold(85)).toBe(85);
    expect(effectiveQaThreshold(0)).toBe(0);
  });

  it("falls back to the legacy pass mark for null/undefined", () => {
    expect(effectiveQaThreshold(null)).toBe(DEFAULT_QA_THRESHOLD);
    expect(effectiveQaThreshold(undefined)).toBe(DEFAULT_QA_THRESHOLD);
  });

  it("falls back for NaN rather than propagating it", () => {
    expect(effectiveQaThreshold(Number.NaN)).toBe(DEFAULT_QA_THRESHOLD);
  });
});

// These are the numbers every call site hardcoded before this module existed
// (QAAssetGrid, QADetailModal, DroneJobs.getQAIndicator: `>= 75` green,
// `>= 50` amber). They are asserted as literals on purpose: the fallback must
// not drift with the DB column default (70), and the warn line must not be
// re-derived as a ratio of the pass mark.
describe("fallback band when no template threshold is available", () => {
  it("pins the legacy constants", () => {
    expect(DEFAULT_QA_THRESHOLD).toBe(75);
    expect(QA_WARN_FLOOR).toBe(50);
  });

  it.each([undefined, null, Number.NaN])(
    "colours the 75/50 band for threshold %p",
    (threshold) => {
      expect(qaVerdict(75, threshold)).toBe("pass");
      expect(qaVerdict(74, threshold)).toBe("warn");
      expect(qaVerdict(50, threshold)).toBe("warn");
      expect(qaVerdict(49, threshold)).toBe("fail");
    }
  );

  it("keeps [70,75) amber — the band a 70 fallback turned green", () => {
    for (const score of [70, 71, 72, 73, 74]) {
      expect(qaVerdict(score)).toBe("warn");
      expect(qaScoreColor(score)).toBe("text-amber-600");
    }
  });

  it("keeps [47,50) red — the band a 70 fallback turned amber", () => {
    for (const score of [47, 48, 49]) {
      expect(qaVerdict(score)).toBe("fail");
      expect(qaScoreColor(score)).toBe("text-red-600");
    }
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

  it("holds the warn line at 50 as the threshold moves", () => {
    // A stricter template raises the green line only. Scaling the warn line
    // with the pass mark would call 59 a fail at threshold 90 and a warn at
    // threshold 75, silently repainting the amber/red boundary per template.
    for (const threshold of [60, 65, 70, 80, 85, 90]) {
      expect(qaVerdict(50, threshold)).toBe("warn");
      expect(qaVerdict(49, threshold)).toBe("fail");
    }
    expect(qaVerdict(59, 90)).toBe("warn");
  });

  it("has no amber band when the pass mark sits at or under the warn line", () => {
    expect(qaVerdict(50, 50)).toBe("pass");
    expect(qaVerdict(49, 50)).toBe("fail");
    expect(qaVerdict(45, 40)).toBe("pass");
    expect(qaVerdict(39, 40)).toBe("fail");
  });

  it("uses the fallback pass mark when none is supplied", () => {
    expect(qaVerdict(75)).toBe("pass");
    expect(qaVerdict(74)).toBe("warn");
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
