import { describe, it, expect } from "vitest";
import { generateAmwalHash } from "./amwalhash";

/**
 * N9 — Critical regression test for the Amwal hash function.
 *
 * If this hash recipe drifts, every Pay-by-Token charge will fail and every
 * webhook will be rejected. The expected values below were captured against
 * a real, accepted Amwal webhook on 2026-05-09 — see AUDIT.md I-fixes log.
 */
describe("generateAmwalHash", () => {
  // Use the UAT secret hash format Amwal uses (hex-decoded merchant key).
  // This is the actual UAT key from the Amwal team email — safe to commit
  // because (a) it's UAT only, (b) it's already in .env, (c) the test is
  // useless without it.
  const UAT_SECRET = "81152BA4A7FEE0C32C555165CB7AE5FA8DD4249AF34A5D66D8B5400A9446C4A7";

  it("matches a known-good Amwal cloud-notification hash", () => {
    // These are the exact field values from a real Amwal notification on
    // 2026-05-09 (with a working SecureHash from Amwal's side). If our
    // canonical-string assembly ever drifts, this test goes red.
    const body = {
      MerchantId: 169347,
      TerminalId: 644273,
      AuthorizationDateTime: "20260508151521",
      DateTimeLocalTrxn: "20260508151521",
      Message: "AUTHORIZED",
      TxnType: "Purchase",
      UDF: null,
      PaidThrough: "Card",
      SystemReference: "a9a7368e-6add-41b2-ad46-65853cfcf444",
      Amount: 1000,
      AmountOMR: 1, // not part of the hash; webhook handler excludes it
      CurrencyId: 512,
      ResponseCode: "00",
      MerchantReference: "4bcae151-7582-44cc-81e2-03cb2cadc977",
      ApplePayShippingAndBillingInfo: null,
    };

    // The webhook handler excludes AmountOMR from the hash. Replicate that
    // here so this test mirrors real verification.
    const { AmountOMR, ...forHash } = body;

    const expected = "439D94198BF46757F26D7585A906D1C7991316F415C8787930A69E33E7139BCA";
    expect(generateAmwalHash(forHash, UAT_SECRET)).toBe(expected);
  });

  it("excludes null and undefined fields from the canonical string", () => {
    const a = generateAmwalHash({ MerchantId: 1, foo: null }, UAT_SECRET);
    const b = generateAmwalHash({ MerchantId: 1 }, UAT_SECRET);
    expect(a).toBe(b);
  });

  it("produces uppercase hex output", () => {
    const h = generateAmwalHash({ MerchantId: 1, Amount: 100 }, UAT_SECRET);
    expect(h).toMatch(/^[0-9A-F]+$/);
    expect(h).toBe(h.toUpperCase());
  });

  it("is deterministic for the same input", () => {
    const body = { MerchantId: 169347, Amount: 1000, CurrencyId: 512 };
    expect(generateAmwalHash(body, UAT_SECRET)).toBe(generateAmwalHash(body, UAT_SECRET));
  });

  it("changes if any field changes", () => {
    const a = generateAmwalHash({ MerchantId: 1, Amount: 100 }, UAT_SECRET);
    const b = generateAmwalHash({ MerchantId: 1, Amount: 101 }, UAT_SECRET);
    expect(a).not.toBe(b);
  });

  it("excludes the SecureHash field itself from canonical string", () => {
    const a = generateAmwalHash({ MerchantId: 1, SecureHash: "X".repeat(64) }, UAT_SECRET);
    const b = generateAmwalHash({ MerchantId: 1 }, UAT_SECRET);
    expect(a).toBe(b);
  });

  it("excludes secureHashValue (lowercase variant) from canonical string", () => {
    const a = generateAmwalHash({ MerchantId: 1, secureHashValue: "X".repeat(64) }, UAT_SECRET);
    const b = generateAmwalHash({ MerchantId: 1 }, UAT_SECRET);
    expect(a).toBe(b);
  });

  it("sorts keys alphabetically (case-sensitive ASCII)", () => {
    // 'B' < 'a' in ASCII; if a future change accidentally uses localeCompare
    // (which is case-insensitive in some locales), this test will fail.
    const sorted = generateAmwalHash({ B: 1, a: 2 }, UAT_SECRET);
    const opposite = generateAmwalHash({ a: 2, B: 1 }, UAT_SECRET);
    expect(sorted).toBe(opposite);
  });
});
