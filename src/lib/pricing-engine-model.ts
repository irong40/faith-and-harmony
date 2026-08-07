import {
  recommendQuote,
  type LineItem,
  type PricingRule,
  type PricingScope,
  type QuoteRecommendation,
} from "@/lib/mission-costing";

export const GROSS_MARGIN_LABEL = "Target Gross Margin";
export const DEFAULT_RETAINER_RATE = 1800;

const formatWholeCurrency = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);

export function formatPricingRulePrice(rule: PricingRule): string {
  if (!rule.available) return "Capability pending";
  const base = rule.basePrice ?? rule.minimumPrice;
  if (rule.pricingModel === "custom" || base === null) return "Scope review";

  if (
    rule.pricingModel === "range" &&
    rule.minimumPrice !== null &&
    rule.maximumPrice !== null
  ) {
    return `${formatWholeCurrency(rule.minimumPrice)}-${formatWholeCurrency(rule.maximumPrice)}`;
  }

  const formatted = formatWholeCurrency(base);
  return rule.pricingModel === "starting_at" ? `Starting at ${formatted}` : formatted;
}

export function isQuantityPriced(rule: PricingRule): boolean {
  return rule.includedQuantity !== null && rule.overageRate !== null;
}

export function buildPricingViewModel({
  trueCost,
  rule,
  scope,
}: {
  trueCost: number;
  rule: PricingRule;
  scope: PricingScope;
}): QuoteRecommendation {
  return recommendQuote({ trueCost, rule, scope });
}

export function buildClientQuoteLineItems(
  rule: PricingRule,
  recommendation: QuoteRecommendation,
): LineItem[] {
  if (recommendation.recommendedQuote === null) {
    throw new Error(`${rule.name} is not quotable until its availability requirements are met`);
  }

  const visibleAddOns =
    recommendation.quantityOverage +
    recommendation.modifierAmount +
    recommendation.travelSurcharge +
    recommendation.manualAuthorizationFee +
    recommendation.rushAmount;
  const serviceAmount = Math.round(
    (recommendation.recommendedQuote - visibleAddOns + Number.EPSILON) * 100,
  ) / 100;
  const items: LineItem[] = [
    { description: rule.name, quantity: 1, unit_price: serviceAmount },
  ];

  if (recommendation.quantityOverage > 0) {
    items.push({
      description: "Additional Acreage / Site Scope",
      quantity: 1,
      unit_price: recommendation.quantityOverage,
    });
  }
  if (recommendation.modifierAmount > 0) {
    items.push({
      description: "Selected Deliverable Add-ons",
      quantity: 1,
      unit_price: recommendation.modifierAmount,
    });
  }
  if (recommendation.travelSurcharge > 0) {
    items.push({
      description: "Travel & Logistics",
      quantity: 1,
      unit_price: recommendation.travelSurcharge,
    });
  }
  if (recommendation.manualAuthorizationFee > 0) {
    items.push({
      description: "Manual Airspace Coordination",
      quantity: 1,
      unit_price: recommendation.manualAuthorizationFee,
    });
  }
  if (recommendation.rushAmount > 0) {
    items.push({
      description: "Rush Turnaround",
      quantity: 1,
      unit_price: recommendation.rushAmount,
    });
  }

  return items;
}
