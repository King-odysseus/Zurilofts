import { env } from './env.js';
import crypto from 'crypto';

const BASE = env.PAYSTACK_BASE_URL;
const SECRET = env.PAYSTACK_SECRET_KEY ?? '';

function requireSecret(): string {
  if (!SECRET || SECRET.startsWith('sk_test_xxxx') || SECRET === 'your_paystack_secret_key') {
    throw new Error(
      'Paystack secret key is not configured. Set PAYSTACK_SECRET_KEY in server/.env (get it from https://dashboard.paystack.com).'
    );
  }
  return SECRET;
}

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    reference: string;
    amount: number;
    paid_at: string;
    channel: string;
    currency: string;
    status: string;
    metadata?: any;
  };
}

interface PaystackBank {
  name: string;
  code: string;
  active: boolean;
}

interface PaystackTransferRecipient {
  recipient_code: string;
  active: boolean;
  name: string;
  type: string;
  currency: string;
  account_number: string;
  bank_code: string;
  details: {
    bank_name: string;
    account_number: string;
    account_name: string;
  };
}

interface PaystackTransferResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    transfer_code: string;
    amount: number;
    status: string;
  };
}

// ---- Helpers ----

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${requireSecret()}`,
    'Content-Type': 'application/json',
  };
}

async function paystackGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paystack GET ${path} failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

async function paystackPost<T>(path: string, body: Record<string, any>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const json = await res.json() as any;
  if (!res.ok || !json.status) {
    throw new Error(`Paystack POST ${path} failed: ${json.message || res.statusText}`);
  }
  return json as T;
}

// ---- Public API ----

/** Initialize a Paystack transaction, returning the authorization_url */
export async function initializeTransaction(params: {
  email: string;
  amount: number; // in KES (the smallest unit = whole KES)
  reference: string;
  metadata?: Record<string, any>;
  callbackUrl?: string;
}): Promise<{ authorizationUrl: string; reference: string; accessCode: string }> {
  // Paystack expects amount in kobo for NGN; for KES it's the subunit (cents).
  // However Paystack's KES integration typically uses the whole-unit amount
  // in the "amount" field — confirmed working with KES.
  const body: Record<string, any> = {
    email: params.email,
    amount: params.amount,
    reference: params.reference,
    currency: 'KES',
    metadata: params.metadata || {},
  };
  if (params.callbackUrl) body.callback_url = params.callbackUrl;

  const res = await paystackPost<PaystackInitResponse>('/transaction/initialize', body);
  return {
    authorizationUrl: res.data.authorization_url,
    reference: res.data.reference,
    accessCode: res.data.access_code,
  };
}

/** Verify a completed transaction */
export async function verifyTransaction(
  reference: string
): Promise<PaystackVerifyResponse['data'] | null> {
  try {
    const res = await paystackGet<PaystackVerifyResponse>(`/transaction/verify/${reference}`);
    if (res.data.status === 'success') return res.data;
    return null;
  } catch {
    return null;
  }
}

function requireWebhookSecret(): string {
  const s = env.PAYSTACK_WEBHOOK_SECRET ?? '';
  if (!s || s === 'whsec_xxxxxxxxxxxxxxxxxxxxxxxx') {
    throw new Error(
      'Paystack webhook secret is not configured. Set PAYSTACK_WEBHOOK_SECRET in server/.env.'
    );
  }
  return s;
}

/** Verify HMAC SHA-512 webhook signature from Paystack */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!env.PAYSTACK_WEBHOOK_SECRET) return false;
  const hash = crypto.createHmac('sha512', env.PAYSTACK_WEBHOOK_SECRET).update(body).digest('hex');
  return hash === signature;
}

/** List banks for a given currency and transfer type */
export async function fetchBanks(
  currency: string = 'KES',
  type: string = 'kepss'
): Promise<PaystackBank[]> {
  const res = await paystackGet<{ status: boolean; data: PaystackBank[] }>(
    `/bank?currency=${currency}&type=${type}`
  );
  return res.data.filter((b) => b.active);
}

/** Create a transfer recipient (bank account for payouts) */
export async function createTransferRecipient(params: {
  name: string;
  accountNumber: string;
  bankCode: string;
  currency?: string;
}): Promise<{ recipientCode: string; bankName: string; accountName: string }> {
  const res = await paystackPost<{ status: boolean; data: PaystackTransferRecipient }>(
    '/transferrecipient',
    {
      type: 'kepss',
      name: params.name,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      currency: params.currency || 'KES',
    }
  );
  return {
    recipientCode: res.data.recipient_code,
    bankName: res.data.details.bank_name,
    accountName: res.data.details.account_name,
  };
}

/** Initiate a transfer to a bank account */
export async function initiateTransfer(params: {
  recipientCode: string;
  amount: number;       // in KES (whole units)
  reason: string;
  reference: string;    // unique reference, use UUID
}): Promise<{ transferRef: string; status: string }> {
  const res = await paystackPost<PaystackTransferResponse>('/transfer', {
    source: 'balance',
    amount: params.amount,
    recipient: params.recipientCode,
    reference: params.reference,
    reason: params.reason,
  });
  return {
    transferRef: res.data.reference,
    status: res.data.status,
  };
}

/** Check Paystack balance */
export async function checkBalance(): Promise<number> {
  const res = await paystackGet<{ status: boolean; data: { balance: number }[] }>('/balance');
  return res.data.reduce((sum, b) => sum + b.balance, 0);
}
