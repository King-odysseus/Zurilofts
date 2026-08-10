import crypto from 'crypto';
import path from 'path';
import { env } from '../config/env.js';
import { ValidationError } from '../types/index.js';

const ALGORITHM = 'aes-256-gcm';
const DOCUMENT_CONTEXT = 'zurilofts:host-documents:v1:';

export const HOST_DOCUMENT_KINDS = [
  'IDENTITY_FRONT',
  'IDENTITY_BACK',
  'PROPERTY_AUTHORITY',
  'BUSINESS_REGISTRATION',
] as const;

export type HostDocumentKind = (typeof HOST_DOCUMENT_KINDS)[number];

function encryptionKey(): Buffer {
  const source = env.HOST_DOCUMENT_ENCRYPTION_KEY || env.JWT_REFRESH_SECRET;
  return crypto.createHash('sha256').update(DOCUMENT_CONTEXT).update(source).digest();
}

export function encryptHostDocument(buffer: Buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

export function decryptHostDocument(ciphertext: Buffer, iv: Buffer, authTag: Buffer): Buffer {
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function detectHostDocumentMime(buffer: Buffer): string {
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  throw new ValidationError('Document content must be a JPEG, PNG, WebP, or PDF file');
}

export function assertHostDocumentKind(value: string): HostDocumentKind {
  if (!(HOST_DOCUMENT_KINDS as readonly string[]).includes(value)) {
    throw new ValidationError('Invalid host document type');
  }
  return value as HostDocumentKind;
}

export function safeDocumentName(value: string): string {
  const name = path.basename(value).replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 120);
  return name || 'document';
}
