import { describe, it, expect } from "vitest";

/**
 * QuoteBuilder deposit percentage tests.
 *
 * These tests verify that the deposit calculation and UI text use 50%
 * (the correct business requirement), not 25%.
 *
 * We test the logic by reading the source file as text rather than rendering
 * the React component, because the component depends on a deep Supabase +
 * React Query stack that is expensive to mock for a simple string/math fix.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const quoteBuilderSource = readFileSync(
  resolve(__dirname, "QuoteBuilder.tsx"),
  "utf-8"
);

const edgeFnSource = readFileSync(
  resolve(__dirname, "../../../../supabase/functions/create-deposit-invoice/index.ts"),
  "utf-8"
);

describe("QuoteBuilder deposit percentage", () => {
  it("calculates suggestedDeposit at 50% (0.5), not 25%", () => {
    expect(quoteBuilderSource).toContain("total * 0.5");
    expect(quoteBuilderSource).not.toContain("total * 0.25");
  });

  it("shows 'Suggested 50%' in the placeholder text", () => {
    expect(quoteBuilderSource).toContain("Suggested 50%");
    expect(quoteBuilderSource).not.toContain("Suggested 25%");
  });

  it("shows '50% deposit' in the suggestion text", () => {
    expect(quoteBuilderSource).toContain("50% deposit");
    expect(quoteBuilderSource).not.toContain("25% deposit");
  });
});

describe("create-deposit-invoice deposit percentage", () => {
  it("invoice description says '50% deposit', not '25% deposit'", () => {
    expect(edgeFnSource).toContain("50% deposit");
    expect(edgeFnSource).not.toContain("25% deposit");
  });

  it("line item name says 'Deposit (50%)', not 'Deposit (25%)'", () => {
    expect(edgeFnSource).toContain("Deposit (50%)");
    expect(edgeFnSource).not.toContain("Deposit (25%)");
  });
});
