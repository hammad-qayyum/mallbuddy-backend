import dotenv from 'dotenv';
import { generateAmwalHash } from './amwalhash';
dotenv.config();

// ISO 4217 numeric currency codes used by Amwal Pay.
// UAT for our merchant is OMR-only.
const CURRENCY_IDS: Record<string, number> = {
  OMR: 512,
  SAR: 682,
  AED: 784,
  KWD: 414,
  BHD: 48,
  QAR: 634,
  USD: 840,
};

const SMARTBOX_SCRIPT_URLS = {
  production: 'https://checkout.amwalpg.com/js/SmartBox.js?v=1.1',
  uat: 'https://test.amwalpg.com:7443/js/SmartBox.js?v=1.1',
  sit: 'https://test.amwalpg.com:19443/js/SmartBox.js?v=1.1',
} as const;

export interface PayByTokenResponse {
  success: boolean;
  responseCode: string;
  message: string;
  data?: {
    systemTraceNr?: string | null;
    message?: string;
    transactionId?: string;
    isOtpRequired?: boolean;
    hostResponseData?: {
      TransactionId?: string;
      Rrn?: string;
      TrackId?: string;
      PaymentId?: string;
      Auth?: string;
    };
    terminalId?: number;
    merchantId?: number;
    amount?: number | string;
    currencyId?: number;
    customerId?: string | null;
    customerTokenId?: string | null;
  } | null;
  errorList?: string[] | null;
}

export interface SmartBoxConfigInput {
  amount: number;
  currency: string;
  merchantReference: string;
  language?: 'en' | 'ar';
  paymentViewType?: 1 | 2;
  /**
   * Returned by `acquireSessionToken(customerId)` after the customer's first
   * "save card" purchase. When set, SmartBox will show the customer's saved
   * cards instead of an empty card form.
   */
  sessionToken?: string;
}

/**
 * Signed config object the frontend hands directly to
 * `SmartBox.Checkout.configure({ ...config, completeCallback, ... })`.
 */
export interface SmartBoxConfig {
  MID: string;
  TID: string;
  CurrencyId: number;
  AmountTrxn: string;
  MerchantReference: string;
  TrxDateTime: string;
  PaymentViewType: 1 | 2;
  LanguageId: 'en' | 'ar';
  SessionToken: string;
  SecureHash: string;
}

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[AmwalPayService] Missing required env var: ${key}`);
  }
  return value;
}

function decimalsForCurrency(code: string): number {
  // OMR / KWD / BHD use 3 decimal places ("fils"); most others use 2.
  return ['OMR', 'KWD', 'BHD'].includes(code.toUpperCase()) ? 3 : 2;
}

export class AmwalPayService {
  private mid: string;
  private tid: string;
  private secureHash: string;

  constructor() {
    this.mid = requiredEnv('AMWAL_MID');
    this.tid = requiredEnv('AMWAL_TID');
    this.secureHash = requiredEnv('AMWAL_SECURE_HASH');
  }

  /**
   * Build the signed SmartBox config object the frontend assigns to
   * `SmartBox.Checkout.configure`. No outbound HTTP — Amwal's server validates
   * the hash when the customer triggers `showSmartBox()` from the browser.
   *
   * Note on field naming: the SDK renames inputs when building the iframe URL
   * (`AmountTrxn` → `Amount`, `CurrencyId` → `Currency`, `LanguageId` →
   * `Language`, `TrxDateTime` → `RequestDateTime`). Amwal's server hashes the
   * URL params, so the SecureHash must be computed over the *URL* names, not
   * the SDK input names.
   */
  buildSmartBoxConfig(input: SmartBoxConfigInput): SmartBoxConfig {
    const currencyCode = input.currency.toUpperCase();
    const currencyId = CURRENCY_IDS[currencyCode];
    if (!currencyId) {
      throw new Error(`[AmwalPayService] Unsupported currency: ${input.currency}`);
    }

    const amountStr = input.amount.toFixed(decimalsForCurrency(currencyCode));
    const trxDateTime = new Date().toISOString();
    const paymentViewType = input.paymentViewType ?? 1;
    const languageId = input.language ?? 'en';
    const sessionToken = input.sessionToken ?? '';

    // Hash field set + names taken verbatim from the Amwal canonical example:
    //   Amount=10&CurrencyId=512&MerchantId=48804&MerchantReference=
    //     &RequestDateTime=...&SessionToken=&TerminalId=113176
    // The SDK sends URL-shorthand keys (MID/TID/Currency) but the server
    // remaps them to canonical names before verifying the hash.
    const hashInput = {
      Amount: amountStr,
      CurrencyId: currencyId,
      MerchantId: Number(this.mid),
      MerchantReference: input.merchantReference,
      RequestDateTime: trxDateTime,
      SessionToken: sessionToken,
      TerminalId: Number(this.tid),
    };
    const SecureHash = generateAmwalHash(hashInput, this.secureHash);

    return {
      MID: this.mid,
      TID: this.tid,
      CurrencyId: currencyId,
      AmountTrxn: amountStr,
      MerchantReference: input.merchantReference,
      TrxDateTime: trxDateTime,
      PaymentViewType: paymentViewType,
      LanguageId: languageId,
      SessionToken: sessionToken,
      SecureHash,
    };
  }

  /**
   * Exchange a customerId (returned by SmartBox `completeCallback` when the
   * customer ticked "save card") for a session token that lets SmartBox show
   * the customer's saved cards on subsequent payments.
   *
   * Per https://amwalpay.om/developers/smartbox/securehash-calculation/
   *   POST {base}/Customer/GetSmartboxDirectCallSessionToken
   *   body: { customerId, merchantId, requestDateTime, secureHashValue }
   */
  /**
   * Server-to-server charge against a previously saved card.
   *
   * Endpoint: POST {base}/Execute/PayByToken
   * Spec: "AMWAL Pay - Webhook – Pay by Token v1.0" PDF.
   * Use this for recurring subscription renewals — no customer interaction.
   */
  async executePayByToken(input: {
    amount: number;
    currency: string;
    customerId: string;
    customerTokenId: string;
    transactionId: string;
    clientMail?: string;
    merchantReference?: string;
  }): Promise<PayByTokenResponse> {
    if (!input.customerId || !input.customerTokenId) {
      throw new Error('customerId and customerTokenId are required');
    }
    if (!input.transactionId) {
      throw new Error('transactionId is required');
    }

    const currencyCode = CURRENCY_IDS[input.currency.toUpperCase()];
    if (!currencyCode) {
      throw new Error(`[AmwalPayService] Unsupported currency: ${input.currency}`);
    }

    const requestBody: Record<string, unknown> = {
      amount: input.amount,
      terminalId: Number(this.tid),
      merchantId: Number(this.mid),
      customerId: input.customerId,
      customerTokenId: input.customerTokenId,
      requestDateTime: new Date().toISOString(),
      currencyCode: String(currencyCode),
      transactionId: input.transactionId,
    };
    if (input.clientMail) requestBody.clientMail = input.clientMail;
    if (input.merchantReference) requestBody.merchantReference = input.merchantReference;

    requestBody.secureHashValue = generateAmwalHash(requestBody, this.secureHash);

    const url = `${AmwalPayService.sessionTokenBaseUrl}/Execute/PayByToken`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const text = await response.text();
    let payload: any;
    try { payload = JSON.parse(text); } catch { payload = { message: text }; }

    if (!response.ok) {
      throw new Error(
        `Amwal PayByToken ${response.status}: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`
      );
    }

    return payload as PayByTokenResponse;
  }

  async acquireSessionToken(customerId: string): Promise<string> {
    if (!customerId || typeof customerId !== 'string') {
      throw new Error('customerId is required');
    }

    const requestBody: Record<string, unknown> = {
      customerId,
      merchantId: Number(this.mid),
      requestDateTime: new Date().toISOString(),
    };
    requestBody.secureHashValue = generateAmwalHash(requestBody, this.secureHash);

    const url = `${AmwalPayService.sessionTokenBaseUrl}/Customer/GetSmartboxDirectCallSessionToken`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const text = await response.text();
    let payload: any;
    try { payload = JSON.parse(text); } catch { payload = text; }

    if (!response.ok) {
      throw new Error(`Amwal session-token API ${response.status}: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
    }

    if (!payload?.success || !payload?.data?.sessionToken) {
      const reason = payload?.message ?? JSON.stringify(payload?.errorList ?? payload);
      throw new Error(`Amwal session-token API rejected request: ${reason}`);
    }

    return payload.data.sessionToken as string;
  }

  private static get sessionTokenBaseUrl(): string {
    const explicit = process.env.AMWAL_SESSION_TOKEN_API_URL ?? process.env.AMWAL_PAYMENT_LINK_API_URL;
    if (explicit) return explicit.replace(/\/+$/, '');
    const apiHost = (process.env.AMWAL_API_URL || '').toLowerCase();
    return apiHost.includes('test.amwalpg.com')
      ? 'https://test.amwalpg.com:14443'
      : 'https://webhook.amwalpg.com';
  }

  static get scriptUrl(): string {
    if (process.env.AMWAL_SMARTBOX_SCRIPT_URL) return process.env.AMWAL_SMARTBOX_SCRIPT_URL;
    // Pick the script URL based on the API host so UAT credentials never load the prod script.
    const apiHost = (process.env.AMWAL_API_URL || '').toLowerCase();
    if (apiHost.includes('test.amwalpg.com')) return SMARTBOX_SCRIPT_URLS.uat;
    if (apiHost.includes('webhook.amwalpg.com') || apiHost.includes('checkout.amwalpg.com')) {
      return SMARTBOX_SCRIPT_URLS.production;
    }
    return SMARTBOX_SCRIPT_URLS.uat;
  }
}
