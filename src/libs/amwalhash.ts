import crypto from 'crypto';

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return JSON.stringify(value);
}

/**
 * HMAC-SHA256 secure hash for Amwal Pay APIs (SmartBox, Acquiring Session Token,
 * Pay-by-Token, etc.).
 *
 * Per Amwal docs:
 *   1. Sort all keys alphabetically (case-sensitive ASCII).
 *   2. Concatenate as `key=value&key=value` — empty values stay (rendered as `key=`).
 *   3. Exclude the hash field itself (`SecureHash` / `secureHashValue`).
 *   4. HMAC-SHA256 with the merchant secret as hex-decoded bytes.
 *   5. Output uppercase hex.
 */
export function generateAmwalHash(params: Record<string, unknown>, secureHash: string): string {
  const canonicalString = Object.entries(params)
    .filter(([key, value]) =>
      key !== 'SecureHash' &&
      key !== 'secureHashValue' &&
      value !== null &&
      value !== undefined
    )
    .sort(([leftKey], [rightKey]) => (leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0))
    .map(([key, value]) => `${key}=${stringifyValue(value)}`)
    .join('&');

  const keyBuffer = Buffer.from(secureHash, 'hex');

  return crypto
    .createHmac('sha256', keyBuffer)
    .update(canonicalString, 'utf8')
    .digest('hex')
    .toUpperCase();
}
