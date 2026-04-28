import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import dotenv from 'dotenv';
import { generateAmwalHash } from './amwalhash';
dotenv.config();

type JsonRecord = Record<string, unknown>;

// ISO 4217 numeric codes for common currencies used with Amwal
const CURRENCY_IDS: Record<string, string> = {
  SAR: '682',
  AED: '784',
  KWD: '414',
  BHD: '048',
  QAR: '634',
  OMR: '512',
  USD: '840',
};

export interface AmwalPaymentIntentInput {
  amount: number;
  currency: string;
  order_id: string;
  biller_ref_number: number | undefined;
  description?: string;
  payer_name: string | undefined;
  payer_email: string | undefined;
  return_url: string;
  metadata?: Record<string, unknown>;
}

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[AmwalPayService] Missing required env var: ${key}`);
  }
  return value;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function asErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function extractProviderError(error: unknown): { status?: number; body?: unknown; message: string } {
  const axiosError = error as AxiosError;
  if (axiosError?.isAxiosError) {
    const result: { status?: number; body?: unknown; message: string } = {
      message: axiosError.message,
    };
    if (typeof axiosError.response?.status === 'number') {
      result.status = axiosError.response.status;
    }
    if (axiosError.response?.data !== undefined) {
      result.body = axiosError.response.data;
    }
    return result;
  }
  return { message: asErrorMessage(error) };
}

export class AmwalPayService {
  private mid: string;
  private tid: string;
  private secureHash: string;
  private baseUrl: string;
  private paymentLinkApiUrl: string;
  private client: AxiosInstance;

  constructor() {
    this.mid = requiredEnv('AMWAL_MID');
    this.tid = requiredEnv('AMWAL_TID');
    this.secureHash = requiredEnv('AMWAL_SECURE_HASH');
    this.baseUrl = normalizeBaseUrl(requiredEnv('AMWAL_API_URL'));
    this.paymentLinkApiUrl = normalizeBaseUrl(
      process.env.AMWAL_PAYMENT_LINK_API_URL ||
        (process.env.NODE_ENV === 'production'
          ? 'https://webhook.amwalpg.com'
          : 'https://test.amwalpg.com:14443')
    );

    this.client = axios.create({
      timeout: Number(process.env.AMWAL_TIMEOUT_MS || 15000),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
      },
    });
  }

  private buildSignedPayload(data: JsonRecord): JsonRecord {
    const params: JsonRecord = { MID: this.mid, TID: this.tid, ...data };
    const hash = generateAmwalHash(params, this.secureHash);
    return { ...params, SecureHash: hash };
  }

  private async post(path: string, data: JsonRecord): Promise<AxiosResponse> {
    const payload = this.buildSignedPayload(data);
    return this.client.post(`${this.baseUrl}${path}`, payload);
  }

  async createCustomer(data: JsonRecord) {
    try {
      return await this.post('/customers', data);
    } catch (error) {
      const providerError = extractProviderError(error);
      console.error('[AmwalPayService] createCustomer error:', providerError);
      throw new Error(`Failed to create Amwal customer: ${providerError.message}`);
    }
  }

  async createSubscription(data: JsonRecord) {
    try {
      return await this.post('/subscriptions', data);
    } catch (error) {
      const providerError = extractProviderError(error);
      console.error('[AmwalPayService] createSubscription error:', providerError);
      throw new Error(`Failed to create Amwal subscription: ${providerError.message}`);
    }
  }

  /**
   * Amwal Pay is a hosted-payment-page gateway (MID/TID flow).
   * Instead of calling a REST API, we build a signed redirect URL
   * that the client navigates to so the user can complete payment
   * on Amwal's hosted page.
   *
   * Returns a synthetic response object whose `data.paymentUrl` contains
   * the redirect URL, matching the shape the controller already expects.
   */
  async createPaymentIntent(input: AmwalPaymentIntentInput): Promise<{ data: { paymentUrl: string } }> {
    const currencyId = CURRENCY_IDS[input.currency.toUpperCase()] ?? '682';
    const amountValue = input.amount.toFixed(2);

    const requestBody: Record<string, unknown> = {
      billerRefNumber: input.biller_ref_number ?? Date.now(),
      payerName: input.payer_name || input.description || input.order_id,
      amount: Number(amountValue),
      currency: Number(currencyId),
      paymentMethod: 1,
      notificationMethod: 1,
      emailNotificationValue: input.payer_email || '',
      smsNotificationValue: '',
      terminalId: Number(this.tid),
      merchantId: Number(this.mid),
      expireDateTime: '',
      maxNumberOfPayment: 1,
      paymentViewType: 2,
      redirectUrl: input.return_url,
    };

    requestBody.secureHashValue = generateAmwalHash(requestBody, this.secureHash);

    const requestUrl = `${this.paymentLinkApiUrl}/MerchantOrder/CreatePaymentLink`;
    try {
      const result = await this.client.post(requestUrl, requestBody);
      const responseData = result.data as Record<string, unknown> | string;
      let paymentUrl: string | null = null;

      if (typeof responseData === 'string' && responseData.trim()) {
        paymentUrl = responseData;
      } else if (responseData && typeof responseData === 'object') {
        const dataField = responseData.data;
        if (typeof dataField === 'string' && dataField.trim()) {
          paymentUrl = dataField;
        } else {
          const urlField = responseData.url;
          if (typeof urlField === 'string' && urlField.trim()) {
            paymentUrl = urlField;
          }
        }
      }

      if (!paymentUrl) {
        throw new Error('Amwal payment link response did not include a payment URL');
      }

      console.log('[AmwalPayService] Payment link created for order', input.order_id);
      return { data: { paymentUrl } };
    } catch (error) {
      const providerError = extractProviderError(error);
      console.error('[AmwalPayService] createPaymentIntent error:', {
        ...providerError,
        requestBody,
      });
      const responseDetails = providerError.body ? ` | ${JSON.stringify(providerError.body)}` : '';
      throw new Error(`Failed to create Amwal payment link: ${providerError.message}${responseDetails}`);
    }
  }
}
