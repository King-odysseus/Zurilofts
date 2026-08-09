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

// ---- Money boundary (KES <-> Paystack subunit) ----

/**
 * Paystack expresses every amount in the currency's minor unit. For KES that is
 * the cent: 1 KES = 100 cents. Application money is stored and reasoned about as
 * whole KES integers; this factor is the single conversion point at the gateway
 * boundary. Never do this multiplication anywhere else.
 */
export const KES_SUBUNIT_FACTOR = 100;

/**
 * Convert a whole-KES amount to Paystack's cent subunit using integer maths only
 * (no floating point). Rejects anything that is not a safe, non-negative integer
 * so a bad amount can never be silently truncated or overflow into a wrong charge.
 */
export function toPaystackSubunit(amountKes: number): number {
  if (typeof amountKes !== 'number' || !Number.isInteger(amountKes)) {
    throw new Error(`Refusing to charge a non-integer KES amount: ${amountKes}`);
  }
  if (amountKes < 0) {
    throw new Error(`Refusing to charge a negative KES amount: ${amountKes}`);
  }
  const subunit = amountKes * KES_SUBUNIT_FACTOR;
  if (!Number.isSafeInteger(subunit)) {
    throw new Error(`KES amount too large to represent safely in subunits: ${amountKes}`);
  }
  return subunit;
}

/**
 * Convert a Paystack cent-subunit amount back to whole KES. Paystack's read
 * endpoints (notably /balance) report money in the minor unit, but application
 * code reasons in whole KES, so normalize here at the same single boundary.
 * Floors to whole KES so an available-balance check can never overstate what
 * can actually be paid out.
 */
export function fromPaystackSubunit(subunit: number): number {
  if (typeof subunit !== 'number' || !Number.isFinite(subunit)) {
    throw new Error(`Refusing to convert a non-numeric Paystack subunit amount: ${subunit}`);
  }
  return Math.floor(subunit / KES_SUBUNIT_FACTOR);
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
  amount: number; // whole KES; converted to the cent subunit at this boundary
  reference: string;
  metadata?: Record<string, any>;
  callbackUrl?: string;
}): Promise<{ authorizationUrl: string; reference: string; accessCode: string }> {
  // Paystack expects the amount in the currency's minor unit (cents for KES).
  // params.amount is whole KES; convert exactly once here at the gateway boundary.
  const body: Record<string, any> = {
    email: params.email,
    amount: toPaystackSubunit(params.amount),
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

/**
 * Fetch a transaction from Paystack for verification.
 *
 * Returns the raw transaction record so the caller can enforce success status,
 * currency, reference, and exact amount. Intentionally does NOT swallow errors:
 * a transport/API failure throws so a provider outage stays distinguishable from
 * a transaction that verified but failed a business check (wrong amount, etc.).
 */
export async function verifyTransaction(
  reference: string
): Promise<PaystackVerifyResponse['data']> {
  const res = await paystackGet<PaystackVerifyResponse>(`/transaction/verify/${reference}`);
  if (!res.status || !res.data) {
    throw new Error(`Paystack verify for ${reference} returned no transaction data: ${res.message}`);
  }
  return res.data;
}

/**
 * Verify the `x-paystack-signature` header on an incoming webhook.
 *
 * Paystack signs the raw event payload as HMAC-SHA512 using your integration
 * SECRET KEY - the very same PAYSTACK_SECRET_KEY used to call the API. Paystack
 * does NOT issue a separate `whsec`-style webhook signing secret (that is a
 * Stripe concept); using the secret key here is what their docs prescribe.
 *
 * The comparison is timing-safe, and absent/malformed signature values are
 * rejected safely (returning false) rather than throwing.
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  if (typeof signature !== 'string' || signature.length === 0) return false;

  const expected = crypto.createHmac('sha512', secret).update(body).digest('hex');
  // Compare the two hex digests as fixed-width byte strings. timingSafeEqual
  // requires equal lengths, so a truncated/malformed signature (wrong length)
  // is rejected up front; equal-length values are then compared in constant
  // time so a mismatch leaks no timing information.
  const expectedBuf = Buffer.from(expected, 'utf8');
  const signatureBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
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
  amount: number;       // whole KES; converted to the cent subunit at this boundary
  reason: string;
  reference: string;    // unique reference, use UUID
}): Promise<{ transferRef: string; status: string }> {
  // params.amount is whole KES; Paystack expects the currency's minor unit
  // (cents for KES). Convert exactly once here at the gateway boundary, reusing
  // the shared helper so a payout can never be sent 100x too small.
  const res = await paystackPost<PaystackTransferResponse>('/transfer', {
    source: 'balance',
    amount: toPaystackSubunit(params.amount),
    recipient: params.recipientCode,
    reference: params.reference,
    reason: params.reason,
  });
  return {
    transferRef: res.data.reference,
    status: res.data.status,
  };
}

/**
 * Available Paystack balance, in WHOLE KES.
 *
 * Paystack's /balance reports each currency's balance in its cent subunit. We
 * take only the KES balance and normalize it to whole KES via fromPaystackSubunit
 * so callers can compare it directly against HostWallet balances (also whole KES)
 * without ever comparing cents against whole units.
 */
export async function checkBalance(): Promise<number> {
  const res = await paystackGet<{ status: boolean; data: { balance: number; currency?: string }[] }>(
    '/balance'
  );
  const kesSubunits = res.data
    .filter((b) => (b.currency ?? 'KES') === 'KES')
    .reduce((sum, b) => sum + b.balance, 0);
  return fromPaystackSubunit(kesSubunits);
}
