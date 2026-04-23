// Utility to generate Amwal Secure Hash (example: SHA256)
import crypto from 'crypto';

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(stableStringify).join('');
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    return sortedKeys.map((key) => stableStringify(obj[key])).join('');
  }
  return String(value);
}

export function generateAmwalHash(params: Record<string, unknown>, secureHash: string): string {
  // Sort top-level keys for deterministic signature generation.
  const sortedKeys = Object.keys(params).sort();
  const concatenated = sortedKeys.map((key) => stableStringify(params[key])).join('');
  const dataToHash = concatenated + secureHash;
  return crypto.createHash('sha256').update(dataToHash).digest('hex');
}
