/**
 * GAP-007 — pure checkout helpers, unit-tested in checkout.helpers.test.ts.
 * Kept free of Prisma/IO so the money math is trivially testable.
 */

/** Round to 2 decimal places (currency). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Human-readable combined order reference, e.g. "#4821QK3F".
 * (Moved verbatim from the old inline generator in checkout.service.ts —
 * uniqueness is backstopped by the DB unique constraint + retry loop.)
 */
export function generateGroupNumber(): string {
  return (
    "#" +
    Date.now().toString().slice(-4) +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
}

/**
 * Child order numbers derived from the group number.
 * Single-restaurant checkout keeps the unsuffixed group number so order
 * references look exactly like they did before GAP-007; multi-restaurant
 * children get "-1", "-2", … suffixes. Customer and restaurant therefore
 * always quote consistent references.
 */
export function deriveChildOrderNumbers(groupNumber: string, count: number): string[] {
  if (count <= 1) return [groupNumber];
  return Array.from({ length: count }, (_, i) => `${groupNumber}-${i + 1}`);
}

/**
 * Discount for one child order: the LARGER of the user-entered promo code
 * (only when it belongs to this restaurant) and the restaurant's live
 * "Deal of the day" Promotion — the customer is never worse off than
 * picking the alternative. Percentages are ints (e.g. 15 = 15%).
 */
export function computeDiscount(
  subtotal: number,
  promoPct: number | null,
  promotionPct: number | null,
): number {
  const promoDiscount = promoPct ? round2((subtotal * promoPct) / 100) : 0;
  const promotionDiscount = promotionPct ? round2((subtotal * promotionPct) / 100) : 0;
  return Math.max(promoDiscount, promotionDiscount);
}
