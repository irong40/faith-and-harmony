import { describe, it, expect } from "vitest";
import {
  calculateMissionCost,
  calculateCostFloor,
  calculateMarketPrice,
  recommendQuote,
  compareToPackage,
  findNearestPackage,
  costingToLineItems,
  type CostingInputs,
  type CostingSettings,
  type PricingRule,
} from "./mission-costing";

const DEFAULT_SETTINGS: CostingSettings = {
  overheadPct: 20,
  depreciationPct: 10,
  adminCostPct: 5,
};

const BASIC_INPUTS: CostingInputs = {
  pilotRate: 150,
  pilotHours: 2,
  voRate: 50,
  voHours: 2,
  editingFee: 75,
  travelGas: 30,
  travelHotel: 0,
  travelRental: 0,
  meals: 25,
  equipmentRental: 0,
  insurancePremium: 50,
};

describe("calculateMissionCost", () => {
  it("computes Stage 1: direct expenses subtotal", () => {
    const result = calculateMissionCost(BASIC_INPUTS, DEFAULT_SETTINGS, 40);
    // 300 + 100 + 75 + 30 + 0 + 0 + 25 + 0 + 50 = 580
    expect(result.pilotLabor).toBe(300);
    expect(result.voLabor).toBe(100);
    expect(result.expensesSubtotal).toBe(580);
  });

  it("computes Stage 2: indirect costs as percentages of subtotal", () => {
    const result = calculateMissionCost(BASIC_INPUTS, DEFAULT_SETTINGS, 40);
    // overhead: 580 * 0.20 = 116
    expect(result.overheadAmount).toBeCloseTo(116, 2);
    // depreciation: 580 * 0.10 = 58
    expect(result.depreciationAmount).toBeCloseTo(58, 2);
    // admin: 580 * 0.05 = 29
    expect(result.adminCostAmount).toBeCloseTo(29, 2);
    // total expenses: 580 + 116 + 58 + 29 = 783
    expect(result.totalExpenses).toBeCloseTo(783, 2);
  });

  it("computes Stage 3 as a true gross-margin floor", () => {
    const result = calculateMissionCost(BASIC_INPUTS, DEFAULT_SETTINGS, 40);
    // $783 / (1 - 0.40) = $1,305, leaving a true 40% gross margin.
    expect(result.profitAmount).toBeCloseTo(522, 2);
    expect(result.totalCharge).toBeCloseTo(1305, 2);
    expect(result.grossMarginPct).toBeCloseTo(40, 2);
  });

  it("computes tax estimate", () => {
    const result = calculateMissionCost(BASIC_INPUTS, DEFAULT_SETTINGS, 40, 6);
    // tax: 1305 * 0.06 = 78.30
    expect(result.taxEstimate).toBeCloseTo(78.3, 2);
  });

  it("handles zero inputs", () => {
    const zeroInputs: CostingInputs = {
      pilotRate: 0, pilotHours: 0,
      voRate: 0, voHours: 0,
      editingFee: 0, travelGas: 0, travelHotel: 0, travelRental: 0,
      meals: 0, equipmentRental: 0, insurancePremium: 0,
    };
    const result = calculateMissionCost(zeroInputs, DEFAULT_SETTINGS, 40);
    expect(result.expensesSubtotal).toBe(0);
    expect(result.totalExpenses).toBe(0);
    expect(result.totalCharge).toBe(0);
  });

  it("handles minimum margin (30%)", () => {
    const result = calculateMissionCost(BASIC_INPUTS, DEFAULT_SETTINGS, 30);
    expect(result.totalCharge).toBeCloseTo(783 / 0.7, 2);
  });

  it("handles maximum margin (60%)", () => {
    const result = calculateMissionCost(BASIC_INPUTS, DEFAULT_SETTINGS, 60);
    expect(result.totalCharge).toBeCloseTo(783 / 0.4, 2);
  });

  it("respects custom settings", () => {
    const custom: CostingSettings = {
      overheadPct: 25,
      depreciationPct: 15,
      adminCostPct: 10,
    };
    const result = calculateMissionCost(BASIC_INPUTS, custom, 40);
    // 580 * 0.25 = 145, 580 * 0.15 = 87, 580 * 0.10 = 58
    // total = 580 + 145 + 87 + 58 = 870
    expect(result.totalExpenses).toBeCloseTo(870, 2);
  });
});

const MAPPING_BASIC_RULE: PricingRule = {
  code: "MAPPING_BASIC",
  name: "Mapping Basic",
  category: "mapping",
  pricingModel: "starting_at",
  basePrice: 800,
  minimumPrice: 800,
  maximumPrice: null,
  unit: "project",
  includedQuantity: 10,
  overageRate: 14,
  targetGrossMarginPct: 40,
  modifiers: {
    manual_authorization: 250,
    next_day: 0.25,
    same_day: 0.5,
  },
  requiresCapability: null,
  available: true,
  effectiveDate: "2026-08-07",
  reviewDueDate: "2026-11-07",
};

describe("calculateCostFloor", () => {
  it("converts true cost to a target gross-margin floor", () => {
    expect(calculateCostFloor(600, 40)).toBe(1000);
  });

  it("rejects invalid costs and margins", () => {
    expect(() => calculateCostFloor(-1, 40)).toThrow(/trueCost/);
    expect(() => calculateCostFloor(100, -1)).toThrow(/targetGrossMarginPct/);
    expect(() => calculateCostFloor(100, 100)).toThrow(/targetGrossMarginPct/);
  });
});

describe("calculateMarketPrice", () => {
  it("charges acreage only above the included quantity", () => {
    const result = calculateMarketPrice(MAPPING_BASIC_RULE, { quantity: 15 });
    expect(result.basePrice).toBe(800);
    expect(result.quantityOverage).toBe(70);
    expect(result.marketPrice).toBe(870);
  });

  it("includes manual coordination and applies rush last", () => {
    const result = calculateMarketPrice(MAPPING_BASIC_RULE, {
      quantity: 10,
      travelSurcharge: 100,
      manualAuthorizationRequired: true,
      rush: "next_day",
    });
    // ($800 + $100 travel + $250 manual coordination) * 1.25
    expect(result.manualAuthorizationFee).toBe(250);
    expect(result.rushAmount).toBe(287.5);
    expect(result.marketPrice).toBe(1437.5);
  });

  it("rejects negative scope and unknown modifiers", () => {
    expect(() => calculateMarketPrice(MAPPING_BASIC_RULE, { quantity: -1 })).toThrow(/quantity/);
    expect(() => calculateMarketPrice(MAPPING_BASIC_RULE, { modifierCodes: ["unknown"] })).toThrow(/unknown/);
  });

  it("warns when the market benchmark is stale", () => {
    const result = calculateMarketPrice(MAPPING_BASIC_RULE, {
      asOfDate: "2026-11-08",
    });
    expect(result.warnings).toContain("market_benchmark_stale");
  });
});

describe("recommendQuote", () => {
  it("uses the cost floor when it is higher than the market price", () => {
    const result = recommendQuote({
      trueCost: 600,
      rule: MAPPING_BASIC_RULE,
      scope: { quantity: 15 },
    });
    expect(result.costFloor).toBe(1000);
    expect(result.marketPrice).toBe(870);
    expect(result.recommendedQuote).toBe(1000);
    expect(result.selectedBasis).toBe("cost_floor");
    expect(result.grossMarginPct).toBe(40);
  });

  it("uses the market price when it is higher than the cost floor", () => {
    const result = recommendQuote({
      trueCost: 300,
      rule: MAPPING_BASIC_RULE,
      scope: { quantity: 15 },
    });
    expect(result.costFloor).toBe(500);
    expect(result.recommendedQuote).toBe(870);
    expect(result.selectedBasis).toBe("market_price");
  });

  it("blocks a capability-gated service without verified capability", () => {
    const thermalRule: PricingRule = {
      ...MAPPING_BASIC_RULE,
      code: "ROOF_COMMERCIAL_THERMAL",
      name: "Commercial Thermal Roof Documentation",
      basePrice: 1200,
      minimumPrice: 1200,
      includedQuantity: null,
      overageRate: null,
      requiresCapability: "thermal",
    };

    const result = recommendQuote({ trueCost: 400, rule: thermalRule, scope: {} });
    expect(result.recommendedQuote).toBeNull();
    expect(result.selectedBasis).toBe("unavailable");
    expect(result.warnings).toContain("required_capability_missing:thermal");
  });

  it("blocks a catalog row explicitly marked unavailable", () => {
    const result = recommendQuote({
      trueCost: 400,
      rule: { ...MAPPING_BASIC_RULE, available: false },
      scope: { verifiedCapabilities: ["thermal"] },
    });
    expect(result.recommendedQuote).toBeNull();
    expect(result.warnings).toContain("service_unavailable");
  });
});

describe("compareToPackage", () => {
  it("returns surcharge warning when cost exceeds package", () => {
    const result = compareToPackage(600, "listing_pro");
    expect(result).not.toBeNull();
    expect(result!.surchargeRequired).toBe(true);
    expect(result!.delta).toBe(150);
    expect(result!.message).toContain("SURCHARGE REQUIRED");
  });

  it("returns within-package message when cost is below", () => {
    const result = compareToPackage(300, "listing_pro");
    expect(result).not.toBeNull();
    expect(result!.surchargeRequired).toBe(false);
    expect(result!.delta).toBe(-150);
    expect(result!.message).toContain("margin remaining");
  });

  it("returns null for unknown package", () => {
    expect(compareToPackage(500, "nonexistent")).toBeNull();
  });

  it("handles exact match", () => {
    const result = compareToPackage(450, "listing_pro");
    expect(result!.delta).toBe(0);
    expect(result!.surchargeRequired).toBe(false);
  });
});

describe("findNearestPackage", () => {
  it("finds closest package by price", () => {
    const result = findNearestPackage(240);
    expect(result.packageCode).toBe("listing_lite");
  });

  it("finds exact match", () => {
    const result = findNearestPackage(850);
    expect(result.packageCode).toBe("commercial_marketing");
  });
});

describe("costingToLineItems", () => {
  it("generates line items from costing", () => {
    const result = calculateMissionCost(BASIC_INPUTS, DEFAULT_SETTINGS, 40);
    const items = costingToLineItems(BASIC_INPUTS, result, DEFAULT_SETTINGS, 40);

    expect(items.length).toBeGreaterThan(0);

    // Check pilot labor line
    const pilotLine = items.find((i) => i.description.includes("Pilot Labor"));
    expect(pilotLine).toBeDefined();
    expect(pilotLine!.unit_price).toBe(300);

    // Check total matches
    const lineTotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    expect(lineTotal).toBeCloseTo(result.totalCharge, 1);
  });

  it("omits zero-value lines", () => {
    const minInputs: CostingInputs = {
      pilotRate: 100, pilotHours: 1,
      voRate: 0, voHours: 0,
      editingFee: 0, travelGas: 0, travelHotel: 0, travelRental: 0,
      meals: 0, equipmentRental: 0, insurancePremium: 0,
    };
    const result = calculateMissionCost(minInputs, DEFAULT_SETTINGS, 40);
    const items = costingToLineItems(minInputs, result, DEFAULT_SETTINGS, 40);

    expect(items.find((i) => i.description.includes("Visual Observer"))).toBeUndefined();
    expect(items.find((i) => i.description.includes("Editing"))).toBeUndefined();
    expect(items.find((i) => i.description.includes("Travel"))).toBeUndefined();
    expect(items.find((i) => i.description.includes("Meals"))).toBeUndefined();
  });
});
