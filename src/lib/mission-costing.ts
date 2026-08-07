/**
 * Mission Costing Engine — Pure Calculation Module
 *
 * Market-aware pricing for drone missions. Three sequential stages:
 *   Stage 1: Direct expenses (manual inputs) → expensesSubtotal
 *   Stage 2: Indirect costs (auto %) → totalExpenses (break-even floor)
 *   Stage 3: True gross-margin floor + market anchor → client recommendation
 *
 * Zero dependencies. No DB, no React. Same logic duplicated in sentinel-core.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface CostingInputs {
  pilotRate: number;
  pilotHours: number;
  voRate: number;
  voHours: number;
  editingFee: number;
  travelGas: number;
  travelHotel: number;
  travelRental: number;
  meals: number;
  equipmentRental: number;
  insurancePremium: number;
}

export interface CostingSettings {
  overheadPct: number;      // e.g. 20 for 20%
  depreciationPct: number;  // e.g. 10 for 10%
  adminCostPct: number;     // e.g. 5 for 5%
}

export interface CostingResult {
  // Stage 1
  pilotLabor: number;
  voLabor: number;
  expensesSubtotal: number;

  // Stage 2
  overheadAmount: number;
  depreciationAmount: number;
  adminCostAmount: number;
  totalExpenses: number; // break-even floor

  // Stage 3
  profitAmount: number;
  totalCharge: number;
  grossMarginPct: number;
  taxEstimate: number;
}

export type PricingModel = "fixed" | "starting_at" | "range" | "custom";

export type PricingRule = {
  code: string;
  name: string;
  category: string;
  pricingModel: PricingModel;
  basePrice: number | null;
  minimumPrice: number | null;
  maximumPrice: number | null;
  unit: string | null;
  includedQuantity: number | null;
  overageRate: number | null;
  targetGrossMarginPct: number;
  modifiers: Record<string, number>;
  requiresCapability: string | null;
  available: boolean;
  effectiveDate: string;
  reviewDueDate: string;
};

export type RushLevel = "standard" | "next_day" | "same_day";

export type PricingScope = {
  quantity?: number;
  travelSurcharge?: number;
  manualAuthorizationRequired?: boolean;
  rush?: RushLevel;
  modifierCodes?: string[];
  verifiedCapabilities?: string[];
  asOfDate?: string;
};

export type MarketPriceResult = {
  basePrice: number;
  quantityOverage: number;
  modifierAmount: number;
  travelSurcharge: number;
  manualAuthorizationFee: number;
  rushMultiplier: number;
  rushAmount: number;
  marketPrice: number;
  quotable: boolean;
  warnings: string[];
};

export type QuoteRecommendation = MarketPriceResult & {
  trueCost: number;
  costFloor: number;
  recommendedQuote: number | null;
  selectedBasis: "cost_floor" | "market_price" | "unavailable";
  grossMarginPct: number | null;
};

export interface PackageComparison {
  packageCode: string;
  packageName: string;
  packagePrice: number;
  delta: number;          // positive = cost exceeds package
  surchargeRequired: boolean;
  message: string;
}

// ── Standard Packages ────────────────────────────────────────────────

export const PACKAGES: Record<string, { name: string; price: number }> = {
  listing_lite:           { name: "Listing Lite",           price: 225 },
  listing_pro:            { name: "Listing Pro",            price: 450 },
  luxury_listing:         { name: "Luxury Listing",         price: 750 },
  construction_progress:  { name: "Construction Progress",  price: 450 },
  commercial_marketing:   { name: "Commercial Marketing",   price: 850 },
  inspection_data:        { name: "Inspection Data",        price: 1200 },
};

const roundCurrency = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const assertNonNegative = (label: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number`);
  }
};

export function calculateCostFloor(trueCost: number, targetGrossMarginPct: number): number {
  assertNonNegative("trueCost", trueCost);
  if (
    !Number.isFinite(targetGrossMarginPct) ||
    targetGrossMarginPct < 0 ||
    targetGrossMarginPct >= 100
  ) {
    throw new RangeError("targetGrossMarginPct must be between 0 and 100");
  }

  return roundCurrency(trueCost / (1 - targetGrossMarginPct / 100));
}

export function calculateMarketPrice(
  rule: PricingRule,
  scope: PricingScope,
): MarketPriceResult {
  const quantity = scope.quantity ?? 0;
  const travelSurcharge = scope.travelSurcharge ?? 0;
  assertNonNegative("quantity", quantity);
  assertNonNegative("travelSurcharge", travelSurcharge);

  const warnings: string[] = [];
  let quotable = rule.available;
  if (!rule.available) warnings.push("service_unavailable");

  const verifiedCapabilities = new Set(scope.verifiedCapabilities ?? []);
  if (rule.requiresCapability && !verifiedCapabilities.has(rule.requiresCapability)) {
    quotable = false;
    warnings.push(`required_capability_missing:${rule.requiresCapability}`);
  }

  const asOfDate = scope.asOfDate ?? new Date().toISOString().slice(0, 10);
  if (asOfDate > rule.reviewDueDate) warnings.push("market_benchmark_stale");

  const basePrice = rule.basePrice ?? rule.minimumPrice ?? 0;
  if (rule.pricingModel === "custom" || basePrice === 0) {
    quotable = false;
    warnings.push("manual_scope_review");
  }

  const includedQuantity = rule.includedQuantity ?? quantity;
  const quantityOverage = roundCurrency(
    Math.max(0, quantity - includedQuantity) * (rule.overageRate ?? 0),
  );

  let modifierAmount = 0;
  for (const code of scope.modifierCodes ?? []) {
    const value = rule.modifiers[code];
    if (value === undefined) throw new RangeError(`unknown modifier: ${code}`);
    assertNonNegative(`modifier ${code}`, value);
    modifierAmount += value;
  }
  modifierAmount = roundCurrency(modifierAmount);

  const manualAuthorizationFee = scope.manualAuthorizationRequired
    ? roundCurrency(rule.modifiers.manual_authorization ?? 250)
    : 0;

  const rush = scope.rush ?? "standard";
  const rushRate = rush === "standard" ? 0 : rule.modifiers[rush];
  if (rushRate === undefined) throw new RangeError(`unknown rush modifier: ${rush}`);
  assertNonNegative(`rush modifier ${rush}`, rushRate);

  const marketSubtotal = roundCurrency(
    basePrice + quantityOverage + modifierAmount + travelSurcharge + manualAuthorizationFee,
  );
  const rushAmount = roundCurrency(marketSubtotal * rushRate);

  return {
    basePrice: roundCurrency(basePrice),
    quantityOverage,
    modifierAmount,
    travelSurcharge: roundCurrency(travelSurcharge),
    manualAuthorizationFee,
    rushMultiplier: 1 + rushRate,
    rushAmount,
    marketPrice: roundCurrency(marketSubtotal + rushAmount),
    quotable,
    warnings,
  };
}

export function recommendQuote({
  trueCost,
  rule,
  scope,
}: {
  trueCost: number;
  rule: PricingRule;
  scope: PricingScope;
}): QuoteRecommendation {
  const costFloor = calculateCostFloor(trueCost, rule.targetGrossMarginPct);
  const market = calculateMarketPrice(rule, scope);

  if (!market.quotable) {
    return {
      ...market,
      trueCost: roundCurrency(trueCost),
      costFloor,
      recommendedQuote: null,
      selectedBasis: "unavailable",
      grossMarginPct: null,
    };
  }

  const recommendedQuote = Math.max(costFloor, market.marketPrice);
  const grossMarginPct = recommendedQuote === 0
    ? 0
    : roundCurrency(((recommendedQuote - trueCost) / recommendedQuote) * 100);

  return {
    ...market,
    trueCost: roundCurrency(trueCost),
    costFloor,
    recommendedQuote,
    selectedBasis: costFloor >= market.marketPrice ? "cost_floor" : "market_price",
    grossMarginPct,
  };
}

// ── Calculation ──────────────────────────────────────────────────────

export function calculateMissionCost(
  inputs: CostingInputs,
  settings: CostingSettings,
  marginPct: number,
  taxRatePct: number = 0,
): CostingResult {
  // Stage 1: Direct Expenses
  const pilotLabor = inputs.pilotRate * inputs.pilotHours;
  const voLabor = inputs.voRate * inputs.voHours;
  const expensesSubtotal =
    pilotLabor +
    voLabor +
    inputs.editingFee +
    inputs.travelGas +
    inputs.travelHotel +
    inputs.travelRental +
    inputs.meals +
    inputs.equipmentRental +
    inputs.insurancePremium;

  // Stage 2: Indirect Costs (percentages of expenses subtotal)
  const overheadAmount = expensesSubtotal * (settings.overheadPct / 100);
  const depreciationAmount = expensesSubtotal * (settings.depreciationPct / 100);
  const adminCostAmount = expensesSubtotal * (settings.adminCostPct / 100);
  const totalExpenses = expensesSubtotal + overheadAmount + depreciationAmount + adminCostAmount;

  // Stage 3: True Gross-Margin Floor
  const totalCharge = calculateCostFloor(totalExpenses, marginPct);
  const profitAmount = totalCharge - totalExpenses;
  const grossMarginPct = totalCharge === 0 ? 0 : (profitAmount / totalCharge) * 100;
  const taxEstimate = totalCharge * (taxRatePct / 100);

  return {
    pilotLabor,
    voLabor,
    expensesSubtotal,
    overheadAmount,
    depreciationAmount,
    adminCostAmount,
    totalExpenses,
    profitAmount,
    totalCharge,
    grossMarginPct,
    taxEstimate,
  };
}

// ── Package Comparison ───────────────────────────────────────────────

export function compareToPackage(
  totalCharge: number,
  packageCode: string,
): PackageComparison | null {
  const pkg = PACKAGES[packageCode];
  if (!pkg) return null;

  const delta = totalCharge - pkg.price;
  const surchargeRequired = delta > 0;

  return {
    packageCode,
    packageName: pkg.name,
    packagePrice: pkg.price,
    delta,
    surchargeRequired,
    message: surchargeRequired
      ? `SURCHARGE REQUIRED: Internal cost exceeds ${pkg.name} ($${pkg.price}) by $${delta.toFixed(2)}`
      : `Within ${pkg.name} package — $${Math.abs(delta).toFixed(2)} margin remaining`,
  };
}

// ── Nearest Package Finder ───────────────────────────────────────────

export function findNearestPackage(
  totalCharge: number,
): PackageComparison {
  let nearest: { code: string; delta: number } | null = null;

  for (const [code, pkg] of Object.entries(PACKAGES)) {
    const delta = Math.abs(totalCharge - pkg.price);
    if (!nearest || delta < Math.abs(nearest.delta)) {
      nearest = { code, delta: totalCharge - pkg.price };
    }
  }

  // Fallback should never happen since PACKAGES is non-empty
  return compareToPackage(totalCharge, nearest!.code)!;
}

// ── Line Items for Quote Conversion ──────────────────────────────────

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export function costingToLineItems(
  inputs: CostingInputs,
  result: CostingResult,
  settings: CostingSettings,
  marginPct: number,
): LineItem[] {
  const items: LineItem[] = [];

  if (result.pilotLabor > 0) {
    items.push({
      description: `Pilot Labor (${inputs.pilotHours}hrs @ $${inputs.pilotRate}/hr)`,
      quantity: 1,
      unit_price: result.pilotLabor,
    });
  }

  if (result.voLabor > 0) {
    items.push({
      description: `Visual Observer (${inputs.voHours}hrs @ $${inputs.voRate}/hr)`,
      quantity: 1,
      unit_price: result.voLabor,
    });
  }

  if (inputs.editingFee > 0) {
    items.push({ description: "Editing / Post-Production", quantity: 1, unit_price: inputs.editingFee });
  }

  const travelTotal = inputs.travelGas + inputs.travelHotel + inputs.travelRental;
  if (travelTotal > 0) {
    items.push({ description: "Travel & Logistics", quantity: 1, unit_price: travelTotal });
  }

  if (inputs.meals > 0) {
    items.push({ description: "Meals & Per Diem", quantity: 1, unit_price: inputs.meals });
  }

  const equipTotal = inputs.equipmentRental + inputs.insurancePremium;
  if (equipTotal > 0) {
    items.push({ description: "Equipment & Insurance", quantity: 1, unit_price: equipTotal });
  }

  const indirectTotal = result.overheadAmount + result.depreciationAmount + result.adminCostAmount;
  if (indirectTotal > 0) {
    items.push({
      description: `Overhead & Admin (${settings.overheadPct + settings.depreciationPct + settings.adminCostPct}%)`,
      quantity: 1,
      unit_price: indirectTotal,
    });
  }

  if (result.profitAmount > 0) {
    items.push({
      description: `Gross Margin (${marginPct}%)`,
      quantity: 1,
      unit_price: result.profitAmount,
    });
  }

  return items;
}
