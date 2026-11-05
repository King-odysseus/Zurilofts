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

import { detectImageFormat, looksLikePdf } from '../src/utils/fileSignature.js';

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

/**
 * Images reach sharp because the upload allowlist trusts the type the client
 * declared. sharp chooses its decoder from the bytes, so the signature is the
 * only thing standing between a mislabelled upload and the HEIF/SVG decoders.
 * These pin that only the four served formats are accepted.
 */
function bytes(...values) {
  return Buffer.from(values);
}

test('each served image format is recognised by its own header', () => {
  const jpeg = Buffer.concat([bytes(0xff, 0xd8, 0xff, 0xe0), Buffer.alloc(16)]);
  const png = Buffer.concat([bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), Buffer.alloc(16)]);
  const gif = Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.alloc(16)]);
  const webp = Buffer.concat([
    Buffer.from('RIFF', 'latin1'),
    bytes(0x20, 0x00, 0x00, 0x00),
    Buffer.from('WEBP', 'latin1'),
    Buffer.alloc(16),
  ]);

  assert.equal(detectImageFormat(jpeg), 'jpeg');
  assert.equal(detectImageFormat(png), 'png');
  assert.equal(detectImageFormat(gif), 'gif');
  assert.equal(detectImageFormat(webp), 'webp');
});

test('formats sharp can decode but the app never serves are refused', () => {
  // HEIF and SVG are the two decoders the advisory trail runs through. Neither
  // may be reached just because a filename said .jpg.
  const heif = Buffer.concat([bytes(0x00, 0x00, 0x00, 0x18), Buffer.from('ftypheic', 'latin1'), Buffer.alloc(16)]);
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>', 'utf8');

  assert.equal(detectImageFormat(heif), null);
  assert.equal(detectImageFormat(svg), null);
});

test('a file that only claims to be an image is refused', () => {
  // The label is the sender's choice; these bytes are what a mislabelled upload
  // actually contains.
  assert.equal(detectImageFormat(Buffer.from('<html><script>alert(1)</script></html>', 'utf8')), null);
  assert.equal(detectImageFormat(Buffer.from('%PDF-1.7\n1 0 obj\n', 'latin1')), null);
});

test('empty and truncated buffers are refused rather than guessed at', () => {
  assert.equal(detectImageFormat(Buffer.alloc(0)), null);
  // A JPEG header cut short of the 12 bytes every real image exceeds.
  assert.equal(detectImageFormat(bytes(0xff, 0xd8, 0xff)), null);
});
