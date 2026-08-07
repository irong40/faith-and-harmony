import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { PricingModel, PricingRule } from "@/lib/mission-costing";

export type PricingCatalogRow = {
  code: string;
  name: string;
  category: string;
  pricing_model: string;
  base_price: number | null;
  minimum_price: number | null;
  maximum_price: number | null;
  unit: string | null;
  included_quantity: number | null;
  overage_rate: number | null;
  target_gross_margin_pct: number;
  modifiers: Json;
  requires_capability: string | null;
  available: boolean;
  effective_date: string;
  review_due_date: string;
};

const COMMON_MODIFIERS = {
  manual_authorization: 250,
  next_day: 0.25,
  same_day: 0.5,
};

const rule = (
  code: string,
  name: string,
  category: string,
  pricingModel: PricingModel,
  basePrice: number,
  options: Partial<PricingRule> = {},
): PricingRule => ({
  code,
  name,
  category,
  pricingModel,
  basePrice,
  minimumPrice: basePrice,
  maximumPrice: pricingModel === "fixed" ? basePrice : null,
  unit: "project",
  includedQuantity: null,
  overageRate: null,
  targetGrossMarginPct: 40,
  modifiers: COMMON_MODIFIERS,
  requiresCapability: null,
  available: true,
  effectiveDate: "2026-08-07",
  reviewDueDate: "2026-11-07",
  ...options,
});

export const PRICING_CATALOG_FALLBACK: PricingRule[] = [
  rule("LISTING_LITE", "Listing Lite", "real_estate", "fixed", 225),
  rule("LISTING_PRO", "Listing Pro", "real_estate", "fixed", 450),
  rule("LUXURY_LISTING", "Luxury Listing", "real_estate", "fixed", 750),
  rule("BROKERAGE_RETAINER", "Brokerage Retainer", "real_estate", "fixed", 1800, {
    unit: "month",
    includedQuantity: 5,
  }),
  rule("CONSTRUCTION_RECURRING", "Construction Progress - Recurring", "construction", "fixed", 450, {
    unit: "visit",
    includedQuantity: 1,
  }),
  rule("CONSTRUCTION_ONE_TIME", "Construction Progress - One-Time", "construction", "fixed", 550, {
    unit: "visit",
    includedQuantity: 1,
  }),
  rule("CONSTRUCTION_MAPPING", "Construction Mapping", "construction", "starting_at", 750),
  rule("CONSTRUCTION_ANALYSIS", "Construction Analysis", "construction", "range", 950, {
    maximumPrice: 1200,
  }),
  rule("COMMERCIAL_MARKETING", "Commercial Marketing", "commercial", "starting_at", 850),
  rule("ROOF_RESIDENTIAL_VISUAL", "Residential Visual Roof Documentation", "inspection", "range", 550, {
    minimumPrice: 450,
    maximumPrice: 650,
    unit: "property",
  }),
  rule("ROOF_COMMERCIAL_VISUAL", "Commercial Visual Roof Documentation", "inspection", "starting_at", 750, {
    unit: "property",
  }),
  rule("ROOF_COMMERCIAL_THERMAL", "Commercial Thermal Roof Documentation", "inspection", "starting_at", 1200, {
    unit: "property",
    requiresCapability: "thermal",
    available: false,
  }),
  rule("MAPPING_BASIC", "Mapping Basic", "mapping", "starting_at", 800, {
    includedQuantity: 10,
    overageRate: 14,
  }),
  rule("MAPPING_PRO", "Mapping Pro", "mapping", "starting_at", 1800, {
    includedQuantity: 25,
    overageRate: 22,
  }),
  rule("MAPPING_ENTERPRISE", "Mapping Enterprise", "mapping", "starting_at", 3500),
  rule("ROUTINE_LAANC", "Routine LAANC", "airspace", "fixed", 0, {
    unit: "authorization",
    modifiers: {},
  }),
  rule("MANUAL_AIRSPACE_COORDINATION", "Manual Airspace Coordination", "airspace", "fixed", 250, {
    unit: "authorization",
    modifiers: {},
  }),
];

const isPricingModel = (value: string): value is PricingModel =>
  ["fixed", "starting_at", "range", "custom"].includes(value);

const toNumericModifiers = (value: Json): Record<string, number> => {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] =>
      typeof entry[1] === "number" && Number.isFinite(entry[1]),
    ),
  );
};

export function mapPricingRow(row: PricingCatalogRow): PricingRule {
  if (!isPricingModel(row.pricing_model)) {
    throw new Error(`Unsupported pricing model: ${row.pricing_model}`);
  }

  return {
    code: row.code,
    name: row.name,
    category: row.category,
    pricingModel: row.pricing_model,
    basePrice: row.base_price,
    minimumPrice: row.minimum_price,
    maximumPrice: row.maximum_price,
    unit: row.unit,
    includedQuantity: row.included_quantity,
    overageRate: row.overage_rate,
    targetGrossMarginPct: row.target_gross_margin_pct,
    modifiers: toNumericModifiers(row.modifiers),
    requiresCapability: row.requires_capability,
    available: row.available,
    effectiveDate: row.effective_date,
    reviewDueDate: row.review_due_date,
  };
}

export function usePricingCatalog() {
  return useQuery({
    queryKey: ["sai-pricing-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sai_pricing_catalog")
        .select("code,name,category,pricing_model,base_price,minimum_price,maximum_price,unit,included_quantity,overage_rate,target_gross_margin_pct,modifiers,requires_capability,available,effective_date,review_due_date")
        .eq("active", true)
        .order("sort_order");

      if (error || !data?.length) {
        console.warn("sai_pricing_catalog unavailable, using reviewed fallback", error?.message);
        return PRICING_CATALOG_FALLBACK;
      }

      return (data as PricingCatalogRow[]).map(mapPricingRow);
    },
    staleTime: 5 * 60 * 1000,
  });
}
