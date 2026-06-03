import { describe, it, expect } from "vitest";
import {
  computeDirectEquivalent,
  type PackagePrice,
} from "./marketplace-offers";

const LIVE_PACKAGES: PackagePrice[] = [
  { code: "listing_lite", category: "real_estate", name: "Real Estate Listing Lite", price: 225 },
  { code: "listing_pro", category: "real_estate", name: "Real Estate Listing Pro", price: 450 },
  { code: "luxury", category: "real_estate", name: "Real Estate Luxury", price: 750 },
  { code: "commercial", category: "commercial", name: "Commercial Marketing", price: 850 },
  { code: "construction", category: "construction", name: "Construction", price: 450 },
];

function offer(partial: Partial<Parameters<typeof computeDirectEquivalent>[0]>) {
  return {
    shot_list: null,
    instructions: null,
    partner_name: null,
    address: null,
    payout: 0,
    ...partial,
  };
}

describe("computeDirectEquivalent", () => {
  it("maps commercial keywords to Commercial Marketing ($850)", () => {
    const result = computeDirectEquivalent(
      offer({ instructions: "Hotel marketing aerials", payout: 300 }),
      LIVE_PACKAGES
    );
    expect(result.key).toBe("commercial");
    expect(result.price).toBe(850);
    expect(result.boardTake).toBe(550);
  });

  it("maps construction keywords to Construction ($450)", () => {
    const result = computeDirectEquivalent(
      offer({ shot_list: "Monthly site progress photos", payout: 200 }),
      LIVE_PACKAGES
    );
    expect(result.key).toBe("construction");
    expect(result.price).toBe(450);
    expect(result.boardTake).toBe(250);
  });

  it("maps luxury/estate to Luxury ($750)", () => {
    const result = computeDirectEquivalent(
      offer({ instructions: "Luxury estate listing", payout: 400 }),
      LIVE_PACKAGES
    );
    expect(result.key).toBe("luxury");
    expect(result.price).toBe(750);
    expect(result.boardTake).toBe(350);
  });

  it("maps residential listing to Listing Pro ($450)", () => {
    const result = computeDirectEquivalent(
      offer({ instructions: "Residential real estate listing photos", payout: 150 }),
      LIVE_PACKAGES
    );
    expect(result.key).toBe("listing_pro");
    expect(result.price).toBe(450);
  });

  it("maps small/lite to Listing Lite ($225)", () => {
    const result = computeDirectEquivalent(
      offer({ instructions: "Small lite listing package", payout: 100 }),
      LIVE_PACKAGES
    );
    expect(result.key).toBe("listing_lite");
    expect(result.price).toBe(225);
  });

  it("maps inspection keywords to a category with no price (n/a)", () => {
    const result = computeDirectEquivalent(
      offer({ shot_list: "Roof inspection imagery", payout: 200 }),
      LIVE_PACKAGES
    );
    expect(result.key).toBe("roof");
    expect(result.price).toBeNull();
    expect(result.boardTake).toBeNull();
  });

  it("defaults to Listing Pro when nothing matches", () => {
    const result = computeDirectEquivalent(
      offer({ instructions: "asdf qwerty", payout: 50 }),
      LIVE_PACKAGES
    );
    expect(result.key).toBe("listing_pro");
    expect(result.price).toBe(450);
  });

  it("falls back to documented figures when no live packages provided", () => {
    const result = computeDirectEquivalent(
      offer({ instructions: "commercial business marketing", payout: 300 })
    );
    expect(result.price).toBe(850);
    expect(result.boardTake).toBe(550);
  });

  it("prefers more specific rules (inspection over commercial)", () => {
    const result = computeDirectEquivalent(
      offer({ instructions: "Commercial building roof inspection", payout: 0 }),
      LIVE_PACKAGES
    );
    expect(result.key).toBe("roof");
  });
});
