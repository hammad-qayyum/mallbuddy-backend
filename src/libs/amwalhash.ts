import crypto from 'crypto';

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(stableStringify).join(',');
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    return sortedKeys.map((key) => `${key}:${stableStringify(obj[key])}`).join('|');
  }
  return String(value);
}

export function generateAmwalHash(params: Record<string, unknown>, secureHash: string): string {
  const canonicalString = Object.entries(params)
    .filter(([key]) => key !== 'SecureHash' && key !== 'secureHashValue')
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${stableStringify(value)}`)
    .join('&');

  const keyBuffer = Buffer.from(secureHash, 'hex');
  return crypto
    .createHmac('sha256', keyBuffer)
    .update(canonicalString, 'utf8')
    .digest('hex')
    .toUpperCase();
}
