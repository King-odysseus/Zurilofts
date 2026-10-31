/**
 * Chat attachments.
 *
 * Every attachment that reaches a message row goes through normalizeAttachments,
 * so these tests pin the two things that matter: what is stored (a clean, capped
 * JSON string rebuilt from known fields, or NULL when there is nothing) and what
 * is refused (urls the chat UI must never offer as a link). Reading back is just
 * as important - a malformed row must degrade to "no attachments" rather than
 * break a whole thread.
 *
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/message-attachments.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeAttachments,
  parseAttachments,
  withParsedAttachments,
} from '../src/utils/messageAttachments.js';

const IMAGE = { url: '/uploads/msg-1.jpg', name: 'photo.jpg', mimeType: 'image/jpeg', size: 1024 };
const PDF = {
  url: 'https://res.cloudinary.com/demo/raw/upload/v1/zurilofts/msg-2.pdf',
  name: 'invoice.pdf',
  mimeType: 'application/pdf',
  size: 204800,
};

test('a valid list round-trips through storage and back', () => {
  const stored = normalizeAttachments([IMAGE, PDF]);
  assert.equal(typeof stored, 'string');
  assert.deepEqual(JSON.parse(stored as string), [IMAGE, PDF]);
  assert.deepEqual(parseAttachments(stored), [IMAGE, PDF]);
});

test('five attachments are allowed, six are not', () => {
  const five = Array.from({ length: 5 }, (_unused, i) => ({
    ...IMAGE,
    url: `/uploads/msg-${i}.jpg`,
  }));
  assert.equal(parseAttachments(normalizeAttachments(five)).length, 5);

  const six = [...five, { ...IMAGE, url: '/uploads/msg-5.jpg' }];
  assert.throws(() => normalizeAttachments(six), /at most 5 files/);
});

test('nothing to attach stores NULL rather than an empty array', () => {
  assert.equal(normalizeAttachments(undefined), null);
  assert.equal(normalizeAttachments(null), null);
  assert.equal(normalizeAttachments([]), null);
});

test('a non-list is refused instead of being coerced', () => {
  assert.throws(() => normalizeAttachments(IMAGE), /must be a list/);
  assert.throws(() => normalizeAttachments('png'), /must be a list/);
});

test('urls that are not ours are refused', () => {
  const badUrls = [
    'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'file:///etc/passwd',
    'ftp://example.com/a.pdf',
    '/etc/passwd',
    '/uploads/../../secret.jpg',
    '',
  ];
  for (const url of badUrls) {
    assert.throws(
      () => normalizeAttachments([{ ...IMAGE, url }]),
      /invalid url/,
      `expected ${url || '(empty)'} to be refused`
    );
  }
});

test('a missing name falls back to a readable label', () => {
  const stored = normalizeAttachments([{ ...IMAGE, name: undefined }]);
  assert.equal(parseAttachments(stored)[0].name, 'Attachment');

  const blank = normalizeAttachments([{ ...IMAGE, name: '   ' }]);
  assert.equal(parseAttachments(blank)[0].name, 'Attachment');
});

test('an unusable size degrades to 0 instead of failing the message', () => {
  const sizes: unknown[] = [undefined, -5, Number.NaN, Number.POSITIVE_INFINITY, '1024'];
  for (const size of sizes) {
    const stored = normalizeAttachments([{ ...IMAGE, size }]);
    assert.equal(parseAttachments(stored)[0].size, 0);
  }

  const rounded = normalizeAttachments([{ ...IMAGE, size: 1024.7 }]);
  assert.equal(parseAttachments(rounded)[0].size, 1025);
});

test('a missing type is refused, a long one is capped', () => {
  assert.throws(() => normalizeAttachments([{ ...IMAGE, mimeType: undefined }]), /invalid type/);

  const stored = normalizeAttachments([{ ...IMAGE, mimeType: `${'x'.repeat(200)}` }]);
  assert.equal(parseAttachments(stored)[0].mimeType.length, 100);
});

test('unknown client keys never reach the stored row', () => {
  const stored = normalizeAttachments([{ ...IMAGE, injected: 'drop table', nested: { a: 1 } }]);
  assert.deepEqual(JSON.parse(stored as string), [IMAGE]);
});

test('parsing tolerates null and malformed rows', () => {
  assert.deepEqual(parseAttachments(null), []);
  assert.deepEqual(parseAttachments(undefined), []);
  assert.deepEqual(parseAttachments(''), []);
  assert.deepEqual(parseAttachments('not json'), []);
  assert.deepEqual(parseAttachments('{"url":"/uploads/a.jpg"}'), []);
  assert.deepEqual(parseAttachments('[{"url":1}]'), []);
});

test('a message row is returned with a real array, not the stored string', () => {
  const row = { id: 'm1', content: 'hi', attachments: normalizeAttachments([IMAGE]) };
  assert.deepEqual(withParsedAttachments(row), { id: 'm1', content: 'hi', attachments: [IMAGE] });

  const textOnly = { id: 'm2', content: 'hi', attachments: null };
  assert.deepEqual(withParsedAttachments(textOnly).attachments, []);
});
