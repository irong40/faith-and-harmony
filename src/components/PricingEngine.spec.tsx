import { describe, expect, it } from "vitest";
import type { PricingRule } from "@/lib/mission-costing";
import {
  DEFAULT_RETAINER_RATE,
  GROSS_MARGIN_LABEL,
  buildClientQuoteLineItems,
  buildPricingViewModel,
  formatPricingRulePrice,
  isQuantityPriced,
} from "@/lib/pricing-engine-model";

const mappingRule: PricingRule = {
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
  modifiers: { manual_authorization: 250, next_day: 0.25, same_day: 0.5 },
  requiresCapability: null,
  available: true,
  effectiveDate: "2026-08-07",
  reviewDueDate: "2026-11-07",
};

describe("pricing engine view model", () => {
  it("uses explicit true-gross-margin language and the approved retainer default", () => {
    expect(GROSS_MARGIN_LABEL).toBe("Target Gross Margin");
    expect(DEFAULT_RETAINER_RATE).toBe(1800);
  });

  it("exposes cost floor, market price, recommendation, and winning basis", () => {
    const view = buildPricingViewModel({
      trueCost: 600,
      rule: mappingRule,
      scope: { quantity: 15 },
    });
    expect(view.costFloor).toBe(1000);
    expect(view.marketPrice).toBe(870);
    expect(view.recommendedQuote).toBe(1000);
    expect(view.selectedBasis).toBe("cost_floor");
  });

  it("marks quantity controls only for rules with included scope and overage", () => {
    expect(isQuantityPriced(mappingRule)).toBe(true);
    expect(isQuantityPriced({ ...mappingRule, includedQuantity: null })).toBe(false);
  });

  it("formats fixed, starting, range, and unavailable prices", () => {
    expect(formatPricingRulePrice({ ...mappingRule, pricingModel: "fixed" })).toBe("$800");
    expect(formatPricingRulePrice(mappingRule)).toBe("Starting at $800");
    expect(formatPricingRulePrice({
      ...mappingRule,
      pricingModel: "range",
      minimumPrice: 450,
      maximumPrice: 650,
    })).toBe("$450-$650");
    expect(formatPricingRulePrice({ ...mappingRule, available: false })).toBe("Capability pending");
  });

  it("builds client-safe line items without internal cost or profit labels", () => {
    const view = buildPricingViewModel({
      trueCost: 300,
      rule: mappingRule,
      scope: {
        quantity: 15,
        travelSurcharge: 100,
        manualAuthorizationRequired: true,
        rush: "next_day",
      },
    });
    const items = buildClientQuoteLineItems(mappingRule, view);
    const descriptions = items.map((item) => item.description).join(" ");
    const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    expect(descriptions).not.toMatch(/labor|overhead|profit|margin/i);
    expect(descriptions).toMatch(/Mapping Basic/);
    expect(descriptions).toMatch(/Manual Airspace Coordination/);
    expect(total).toBe(view.recommendedQuote);
  });

  it("blocks quote line items for unavailable thermal work", () => {
    const view = buildPricingViewModel({
      trueCost: 300,
      rule: { ...mappingRule, requiresCapability: "thermal", available: false },
      scope: {},
    });
    expect(view.recommendedQuote).toBeNull();
    expect(() => buildClientQuoteLineItems(mappingRule, view)).toThrow(/not quotable/);
  });
});
