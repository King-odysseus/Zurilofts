/**
 * Run from server/:
 *   node --import tsx --test tests/sanitize-html.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeHtml } from '../src/utils/sanitizeHtml.js';

test('keeps the markup the seed guides actually use', () => {
  const input = '<h2>Kilimani</h2><p><strong>Best for:</strong> food lovers.</p><ul><li>Yaya Centre</li></ul>';
  assert.equal(sanitizeHtml(input), input);
});

test('passes existing entities through unchanged', () => {
  assert.equal(sanitizeHtml('<p>tea &amp; coffee</p>'), '<p>tea &amp; coffee</p>');
});

test('removes script tags together with their contents', () => {
  const output = sanitizeHtml('<p>before</p><script>alert(1)</script><p>after</p>');
  assert.equal(output, '<p>before</p><p>after</p>');
  assert.ok(!output.includes('alert'));
});

test('removes iframe contents rather than leaving them visible', () => {
  assert.equal(sanitizeHtml('<iframe src="https://evil.test">fallback</iframe>'), '');
});

test('keeps text that follows a raw-text element', () => {
  // Guards the closing raw-text path: an opening tag swallows up to its close,
  // but a closing tag must not swallow the rest of the document.
  assert.equal(sanitizeHtml('<script>x</script><p>after</p>'), '<p>after</p>');
});

test('strips inline event handlers', () => {
  const output = sanitizeHtml('<img src="/a.png" onerror="alert(1)" alt="x" />');
  assert.equal(output, '<img src="/a.png" alt="x" />');
  assert.ok(!output.includes('onerror'));
});

test('strips style attributes', () => {
  assert.equal(sanitizeHtml('<p style="background:url(javascript:1)">x</p>'), '<p>x</p>');
});

test('rejects javascript: URLs', () => {
  assert.equal(sanitizeHtml('<a href="javascript:alert(1)">click</a>'), '<a>click</a>');
});

test('rejects entity-obfuscated and control-character schemes', () => {
  assert.equal(sanitizeHtml('<a href="&#106;avascript:alert(1)">click</a>'), '<a>click</a>');
  assert.equal(sanitizeHtml('<a href="java\tscript:alert(1)">click</a>'), '<a>click</a>');
});

test('keeps relative and https links', () => {
  assert.equal(sanitizeHtml('<a href="/guides/nairobi">x</a>'), '<a href="/guides/nairobi">x</a>');
  assert.equal(sanitizeHtml('<a href="https://example.com">x</a>'), '<a href="https://example.com">x</a>');
});

test('drops unknown tags but keeps their text', () => {
  assert.equal(sanitizeHtml('<marquee>hello</marquee>'), 'hello');
});

test('drops comments and doctypes', () => {
  assert.equal(sanitizeHtml('<!-- hi --><p>x</p>'), '<p>x</p>');
});

test('escapes a stray less-than instead of treating it as a tag', () => {
  assert.equal(sanitizeHtml('<p>a < b</p>'), '<p>a &lt; b</p>');
});

test('finds the tag end past a greater-than inside a quoted attribute', () => {
  assert.equal(sanitizeHtml('<a title="a > b" href="/x">y</a>'), '<a title="a > b" href="/x">y</a>');
});

test('returns an empty string for non-string input', () => {
  assert.equal(sanitizeHtml(undefined as unknown as string), '');
});
