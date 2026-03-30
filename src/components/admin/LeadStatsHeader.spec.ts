import { describe, it, expect } from "vitest";
import { formatResponseTime, responseTimeColor } from "./LeadStatsHeader";

describe("formatResponseTime", () => {
  it("formats hours under 48 as hours with one decimal", () => {
    expect(formatResponseTime(4.5)).toBe("4.5h");
  });

  it("formats zero hours", () => {
    expect(formatResponseTime(0)).toBe("0.0h");
  });

  it("formats 23.9 hours as hours", () => {
    expect(formatResponseTime(23.9)).toBe("23.9h");
  });

  it("formats 47.9 hours as hours (under 48 threshold)", () => {
    expect(formatResponseTime(47.9)).toBe("47.9h");
  });

  it("formats exactly 48 hours as days", () => {
    expect(formatResponseTime(48)).toBe("2.0d");
  });

  it("formats 72 hours as 3.0 days", () => {
    expect(formatResponseTime(72)).toBe("3.0d");
  });

  it("formats 36 hours as days when above 48 threshold", () => {
    expect(formatResponseTime(120)).toBe("5.0d");
  });

  it("formats fractional day values", () => {
    expect(formatResponseTime(60)).toBe("2.5d");
  });
});

describe("responseTimeColor", () => {
  it("returns green for under 24 hours", () => {
    expect(responseTimeColor(0)).toBe("text-green-600");
    expect(responseTimeColor(12)).toBe("text-green-600");
    expect(responseTimeColor(23.9)).toBe("text-green-600");
  });

  it("returns amber for 24 to 48 hours", () => {
    expect(responseTimeColor(24)).toBe("text-amber-500");
    expect(responseTimeColor(36)).toBe("text-amber-500");
    expect(responseTimeColor(47.9)).toBe("text-amber-500");
  });

  it("returns red for 48 hours and above", () => {
    expect(responseTimeColor(48)).toBe("text-red-500");
    expect(responseTimeColor(72)).toBe("text-red-500");
    expect(responseTimeColor(168)).toBe("text-red-500");
  });
});
