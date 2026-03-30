/**
 * Mission Costing Engine — Pure Calculation Module
 *
 * Cost-plus pricing for drone missions. Three sequential stages:
 *   Stage 1: Direct expenses (manual inputs) → expensesSubtotal
 *   Stage 2: Indirect costs (auto %) → totalExpenses (break-even floor)
 *   Stage 3: Margin application → totalCharge (client quote)
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
  taxEstimate: number;
}

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

  // Stage 3: Margin & Final Quote
  const profitAmount = totalExpenses * (marginPct / 100);
  const totalCharge = totalExpenses + profitAmount;
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
      description: `Profit Margin (${marginPct}%)`,
      quantity: 1,
      unit_price: result.profitAmount,
    });
  }

  return items;
}
