import { describe, it, expect } from "vitest";
import {
  calculateMissionCost,
  compareToPackage,
  findNearestPackage,
  costingToLineItems,
  type CostingInputs,
  type CostingSettings,
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

  it("computes Stage 3: margin and final charge", () => {
    const result = calculateMissionCost(BASIC_INPUTS, DEFAULT_SETTINGS, 40);
    // profit: 783 * 0.40 = 313.20
    expect(result.profitAmount).toBeCloseTo(313.2, 2);
    // total charge: 783 + 313.20 = 1096.20
    expect(result.totalCharge).toBeCloseTo(1096.2, 2);
  });

  it("computes tax estimate", () => {
    const result = calculateMissionCost(BASIC_INPUTS, DEFAULT_SETTINGS, 40, 6);
    // tax: 1096.20 * 0.06 = 65.772
    expect(result.taxEstimate).toBeCloseTo(65.772, 2);
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
    expect(result.profitAmount).toBeCloseTo(783 * 0.3, 2);
  });

  it("handles maximum margin (60%)", () => {
    const result = calculateMissionCost(BASIC_INPUTS, DEFAULT_SETTINGS, 60);
    expect(result.profitAmount).toBeCloseTo(783 * 0.6, 2);
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
