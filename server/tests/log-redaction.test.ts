import { test } from 'node:test';
import assert from 'node:assert/strict';

import { redactResetToken } from '../src/utils/logRedaction.js';

test('a reset link loses its token but keeps the path', () => {
  assert.equal(
    redactResetToken('/reset-password?token=abc123.def-456'),
    '/reset-password?token=[redacted]',
  );
});

test('the token is stripped from a referer that carries other parameters too', () => {
  assert.equal(
    redactResetToken('https://thezurilofts.com/reset-password?lang=sw&token=abc123'),
    'https://thezurilofts.com/reset-password?lang=sw&token=[redacted]',
  );
});

test('unrelated paths and parameters are left alone', () => {
  assert.equal(redactResetToken('/api/bookings?page=2'), '/api/bookings?page=2');
  assert.equal(redactResetToken(undefined), '-');
});
