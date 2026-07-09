import { describe, it, expect } from "vitest";
import {
  round2,
  generateGroupNumber,
  deriveChildOrderNumbers,
  computeDiscount,
} from "./checkout.helpers";

/**
 * GAP-007 — the money math for multi-restaurant checkout. If any of these
 * drift, child order totals and the grand total drift with them.
 */
describe("round2", () => {
  it("rounds to 2 decimal places", () => {
    expect(round2(10.156)).toBe(10.16);
    expect(round2(10.154)).toBe(10.15);
  });

  it("kills float noise from additions", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(10.15 + 13.3)).toBe(23.45);
  });

  it("keeps integers and clean values untouched", () => {
    expect(round2(5)).toBe(5);
    expect(round2(2.5)).toBe(2.5);
    expect(round2(0)).toBe(0);
  });
});

describe("generateGroupNumber", () => {
  it("produces a #-prefixed reference of the expected shape", () => {
    const n = generateGroupNumber();
    expect(n).toMatch(/^#\d{4}[A-Z0-9]{4}$/);
  });
});

describe("deriveChildOrderNumbers", () => {
  it("N=1 keeps the unsuffixed group number (single-restaurant regression)", () => {
    expect(deriveChildOrderNumbers("#4821QK3F", 1)).toEqual(["#4821QK3F"]);
  });

  it("N>1 derives -1..-N suffixes", () => {
    expect(deriveChildOrderNumbers("#4821QK3F", 3)).toEqual([
      "#4821QK3F-1",
      "#4821QK3F-2",
      "#4821QK3F-3",
    ]);
  });

  it("derived numbers are unique", () => {
    const numbers = deriveChildOrderNumbers("#0001AAAA", 5);
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});

describe("computeDiscount", () => {
  it("applies the promo code percentage", () => {
    expect(computeDiscount(100, 15, null)).toBe(15);
  });

  it("applies the live promotion percentage", () => {
    expect(computeDiscount(100, null, 20)).toBe(20);
  });

  it("takes the larger of promo vs promotion (customer never worse off)", () => {
    expect(computeDiscount(100, 15, 20)).toBe(20);
    expect(computeDiscount(100, 25, 20)).toBe(25);
  });

  it("returns 0 when neither applies", () => {
    expect(computeDiscount(100, null, null)).toBe(0);
  });

  it("rounds each candidate to 2dp", () => {
    // 33.335 * 10% = 3.3335 → 3.33
    expect(computeDiscount(33.335, 10, null)).toBe(3.33);
  });
});

describe("grand total math", () => {
  it("sum of 2dp child totals re-rounded is exact", () => {
    const childTotals = [10.15, 13.3, 7.05];
    const grand = round2(childTotals.reduce((s, t) => s + t, 0));
    expect(grand).toBe(30.5);
  });
});
