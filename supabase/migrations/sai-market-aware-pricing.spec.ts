import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260807160000_sai_market_aware_pricing.sql",
);

const migration = () => readFileSync(migrationPath, "utf8");

describe("SAI market-aware pricing migration", () => {
  it("creates the canonical catalog, customer-safe view, and access controls", () => {
    const sql = migration();
    expect(sql).toMatch(/create table if not exists public\.sai_pricing_catalog/i);
    expect(sql).toMatch(/alter table public\.sai_pricing_catalog enable row level security/i);
    expect(sql).toMatch(/create or replace view public\.sai_public_pricing_catalog/i);
    expect(sql).toMatch(/public\.has_role\(auth\.uid\(\), 'admin'\)/i);
    expect(sql).toMatch(/revoke all on public\.sai_pricing_catalog from anon/i);
  });

  it.each([
    ["LISTING_LITE", "225.00"],
    ["LISTING_PRO", "450.00"],
    ["LUXURY_LISTING", "750.00"],
    ["BROKERAGE_RETAINER", "1800.00"],
    ["CONSTRUCTION_RECURRING", "450.00"],
    ["CONSTRUCTION_ONE_TIME", "550.00"],
    ["CONSTRUCTION_MAPPING", "750.00"],
    ["COMMERCIAL_MARKETING", "850.00"],
    ["ROOF_COMMERCIAL_THERMAL", "1200.00"],
    ["MAPPING_BASIC", "800.00"],
    ["MAPPING_PRO", "1800.00"],
    ["MAPPING_ENTERPRISE", "3500.00"],
    ["ROUTINE_LAANC", "0.00"],
    ["MANUAL_AIRSPACE_COORDINATION", "250.00"],
  ])("seeds %s at %s", (code, price) => {
    const sql = migration();
    expect(sql).toContain(`('${code}'`);
    expect(sql).toContain(price);
  });

  it("uses an effective date and quarterly review date", () => {
    const sql = migration();
    expect(sql).toContain("DATE '2026-08-07'");
    expect(sql).toContain("DATE '2026-11-07'");
  });

  it("keeps thermal pricing unavailable until capability is verified", () => {
    const sql = migration();
    expect(sql).toMatch(/ROOF_COMMERCIAL_THERMAL[\s\S]*?'thermal'[\s\S]*?false/i);
    expect(sql).toMatch(/where code = 'ROOF_INSPECTION'[\s\S]*?;/i);
    expect(sql).toMatch(/active = false/i);
  });

  it("extends mission costings for recommendation and realized-margin audit", () => {
    const sql = migration();
    for (const column of [
      "pricing_rule_code",
      "cost_floor",
      "market_price",
      "recommended_quote",
      "quote_id",
      "actual_labor_cost",
      "actual_direct_expenses",
      "actual_total_cost",
      "realized_gross_margin_pct",
    ]) {
      expect(sql).toMatch(new RegExp(`add column if not exists ${column}`, "i"));
    }
  });

  it("upserts catalog rows and updates operational packages without recreating them", () => {
    const sql = migration();
    expect(sql).toMatch(/on conflict \(code\) do update/i);
    expect(sql).toMatch(/update public\.drone_packages/i);
    expect(sql).not.toMatch(/create table.*drone_packages/i);
  });
});
