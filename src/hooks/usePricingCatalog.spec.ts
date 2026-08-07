import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

import {
  PRICING_CATALOG_FALLBACK,
  mapPricingRow,
} from "./usePricingCatalog";

describe("pricing catalog fallback", () => {
  it("matches the approved core package and modifier values", () => {
    const byCode = new Map(PRICING_CATALOG_FALLBACK.map((rule) => [rule.code, rule]));
    expect(byCode.get("LISTING_LITE")?.basePrice).toBe(225);
    expect(byCode.get("BROKERAGE_RETAINER")?.basePrice).toBe(1800);
    expect(byCode.get("CONSTRUCTION_ONE_TIME")?.basePrice).toBe(550);
    expect(byCode.get("MAPPING_BASIC")?.includedQuantity).toBe(10);
    expect(byCode.get("MAPPING_BASIC")?.overageRate).toBe(14);
    expect(byCode.get("ROOF_COMMERCIAL_THERMAL")?.available).toBe(false);
    expect(byCode.get("ROUTINE_LAANC")?.basePrice).toBe(0);
    expect(byCode.get("MANUAL_AIRSPACE_COORDINATION")?.basePrice).toBe(250);
  });

  it("maps snake_case database rows to the pure pricing domain", () => {
    const mapped = mapPricingRow({
      code: "MAPPING_PRO",
      name: "Mapping Pro",
      category: "mapping",
      pricing_model: "starting_at",
      base_price: 1800,
      minimum_price: 1800,
      maximum_price: null,
      unit: "project",
      included_quantity: 25,
      overage_rate: 22,
      target_gross_margin_pct: 40,
      modifiers: { manual_authorization: 250, next_day: 0.25, same_day: 0.5 },
      requires_capability: null,
      available: true,
      effective_date: "2026-08-07",
      review_due_date: "2026-11-07",
    });

    expect(mapped.code).toBe("MAPPING_PRO");
    expect(mapped.pricingModel).toBe("starting_at");
    expect(mapped.includedQuantity).toBe(25);
    expect(mapped.modifiers.same_day).toBe(0.5);
  });
});
