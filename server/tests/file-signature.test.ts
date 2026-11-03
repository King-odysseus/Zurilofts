/**
 * Uploaded-file content checks.
 *
 * A browser sends the MIME type from the sender's chosen filename, so a file
 * labelled application/pdf can hold anything. These tests pin that the bytes
 * decide, not the label.
 *
 * Run from server/:
 *   node --import tsx --test tests/file-signature.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { looksLikePdf } from '../src/utils/fileSignature.js';

test('a real PDF header is recognised', () => {
  const buffer = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n', 'latin1');
  assert.equal(looksLikePdf(buffer), true);
});

test('a PDF with leading junk is still recognised', () => {
  // The format tolerates a short preamble, and readers look near the start.
  const buffer = Buffer.concat([Buffer.from('\n\n'), Buffer.from('%PDF-1.4\n')]);
  assert.equal(looksLikePdf(buffer), true);
});

test('HTML labelled as a PDF is refused', () => {
  const buffer = Buffer.from('<html><script>alert(1)</script></html>', 'utf8');
  assert.equal(looksLikePdf(buffer), false);
});

test('a signature far past the header window is not trusted', () => {
  const buffer = Buffer.concat([Buffer.alloc(4096, 0x20), Buffer.from('%PDF-1.7\n')]);
  assert.equal(looksLikePdf(buffer), false);
});

test('an empty buffer is refused', () => {
  assert.equal(looksLikePdf(Buffer.alloc(0)), false);
});
