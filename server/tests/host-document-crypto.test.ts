import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertHostDocumentKind,
  decryptHostDocument,
  detectHostDocumentMime,
  encryptHostDocument,
  safeDocumentName,
} from '../src/utils/hostDocumentCrypto.js';

test('host documents round-trip through authenticated encryption', () => {
  const source = Buffer.from('private identity document');
  const encrypted = encryptHostDocument(source);
  assert.notDeepEqual(encrypted.ciphertext, source);
  assert.deepEqual(decryptHostDocument(encrypted.ciphertext, encrypted.iv, encrypted.authTag), source);
});

test('tampering with an encrypted host document is rejected', () => {
  const encrypted = encryptHostDocument(Buffer.from('private document'));
  encrypted.ciphertext[0] ^= 1;
  assert.throws(() => decryptHostDocument(encrypted.ciphertext, encrypted.iv, encrypted.authTag));
});

test('document content type is detected from magic bytes', () => {
  assert.equal(detectHostDocumentMime(Buffer.from([0xff, 0xd8, 0xff, 0x00])), 'image/jpeg');
  assert.equal(detectHostDocumentMime(Buffer.from('%PDF-1.7')), 'application/pdf');
  assert.throws(() => detectHostDocumentMime(Buffer.from('not a document')), /JPEG, PNG, WebP, or PDF/);
});

test('document kinds and filenames are constrained', () => {
  assert.equal(assertHostDocumentKind('IDENTITY_FRONT'), 'IDENTITY_FRONT');
  assert.throws(() => assertHostDocumentKind('PASSPORT; DROP TABLE'));
  assert.equal(safeDocumentName('../../id<script>.pdf'), 'id_script_.pdf');
});
