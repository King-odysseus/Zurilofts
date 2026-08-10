import crypto from 'crypto';
import { ValidationError } from '../types/index.js';

/** Normalize common Kenyan formats to the local 10-digit format Paystack documents. */
export function normalizeKenyanMpesaPhone(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  let local = digits;

  if (/^254[17]\d{8}$/.test(digits)) {
    local = `0${digits.slice(3)}`;
  }

  if (!/^0[17]\d{8}$/.test(local)) {
    throw new ValidationError('Enter a valid Kenyan M-PESA number, for example 0712345678.');
  }

  return local;
}

/** Bind a reusable Paystack recipient code to one exact payout destination. */
export function payoutRecipientKey(method: 'bank' | 'mpesa', accountNumber: string, bankCode: string): string {
  return crypto
    .createHash('sha256')
    .update(`${method}|${accountNumber}|${bankCode}`)
    .digest('hex');
}

export function maskPayoutAccount(value?: string | null): string | null {
  if (!value) return null;
  return `•••• ${value.slice(-4)}`;
}
