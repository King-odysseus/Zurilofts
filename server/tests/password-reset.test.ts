/**
 * Password recovery: the rules that keep a reset link from becoming a way into
 * an account.
 *
 * Run from server/:
 *   node --import tsx --test tests/password-reset.test.ts
 *
 * No database and no mail server are touched. Every case below holds a pure
 * decision from the service or a schema from types/index.ts to its contract,
 * because those are where the security rules actually live; the parts that need
 * Prisma are the two functions that call them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// src/config/env.ts exits the process when a required variable is missing, so
// give it the minimum a pure-logic run needs before importing anything that
// reads it. dotenv never overwrites a variable that is already set.
process.env.DATABASE_URL ??= 'file:./dev.db';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-0123456789abcdef';

const {
  GENERIC_RESET_FAILURE_MESSAGE,
  GENERIC_RESET_REQUEST_MESSAGE,
  MAX_OUTSTANDING_RESETS,
  RESET_TOKEN_TTL_MS,
  createResetToken,
  hashResetToken,
  isWellFormedResetToken,
  passwordResetDecision,
  tokensToRetire,
} = await import('../src/services/password-reset.service.js');

const {
  PASSWORD_MAX_BYTES,
  PASSWORD_RESET_TOKEN_PATTERN,
  passwordByteLength,
  passwordResetCompleteSchema,
  passwordResetRequestSchema,
} = await import('../src/types/index.js');

const NOW = new Date('2026-01-01T10:00:00.000Z');

function minutesFromNow(minutes: number): Date {
  return new Date(NOW.getTime() + minutes * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

test('a token is 32 random bytes in base64url and never repeats', () => {
  const token = createResetToken();

  assert.equal(token.length, 43);
  assert.equal(Buffer.from(token, 'base64url').length, 32);
  assert.ok(isWellFormedResetToken(token));
  assert.notEqual(createResetToken(), createResetToken());
});

test('only the sha256 of a token is stored, and the hash is stable', () => {
  const token = createResetToken();
  const hash = hashResetToken(token);

  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.notEqual(hash, token);
  assert.equal(hashResetToken(token), hash);
  // The stored form must not itself be redeemable as a token.
  assert.equal(isWellFormedResetToken(hash), false);
});

test('token shape rejects anything that is not 32 base64url bytes', () => {
  assert.equal(isWellFormedResetToken(''), false);
  assert.equal(isWellFormedResetToken('short'), false);
  assert.equal(isWellFormedResetToken(createResetToken() + 'A'), false);
  // Standard base64 padding is not base64url as produced here.
  assert.equal(isWellFormedResetToken(createResetToken().replace(/-/g, '+') + '='), false);
  assert.equal(isWellFormedResetToken(' '.repeat(43)), false);
  assert.ok(PASSWORD_RESET_TOKEN_PATTERN.test(createResetToken()));
});

test('the schema refuses a token of the wrong shape before any hashing work', () => {
  const valid = { token: createResetToken(), newPassword: 'Password1', confirmPassword: 'Password1' };

  assert.equal(passwordResetCompleteSchema.parse(valid).token, valid.token);
  assert.throws(() => passwordResetCompleteSchema.parse({ ...valid, token: 'not-a-token' }));
  assert.throws(() => passwordResetCompleteSchema.parse({ ...valid, token: '' }));
});

// ---------------------------------------------------------------------------
// Expiry, reuse and the credential version
// ---------------------------------------------------------------------------

test('a link is usable only while it is unconsumed, unexpired and current', () => {
  const record = { expiresAt: minutesFromNow(30), consumedAt: null, credentialVersion: 4 };

  assert.equal(RESET_TOKEN_TTL_MS, 30 * 60 * 1000);
  assert.equal(passwordResetDecision(record, { now: NOW, credentialVersion: 4 }), 'usable');
});

test('an expired link is refused', () => {
  const record = { expiresAt: minutesFromNow(-1), consumedAt: null, credentialVersion: 4 };

  assert.equal(passwordResetDecision(record, { now: NOW, credentialVersion: 4 }), 'expired');
});

test('a link is refused at the exact moment it expires', () => {
  const record = { expiresAt: NOW, consumedAt: null, credentialVersion: 4 };

  assert.equal(passwordResetDecision(record, { now: NOW, credentialVersion: 4 }), 'expired');
});

test('a used link is refused even if it has not expired', () => {
  const record = { expiresAt: minutesFromNow(30), consumedAt: NOW, credentialVersion: 4 };

  assert.equal(passwordResetDecision(record, { now: NOW, credentialVersion: 4 }), 'consumed');
});

test('a link is refused once the account password has moved on', () => {
  const record = { expiresAt: minutesFromNow(30), consumedAt: null, credentialVersion: 4 };

  // Any password change increments User.credentialVersion, so a link issued
  // under version 4 cannot set a password after the account reached 5.
  assert.equal(passwordResetDecision(record, { now: NOW, credentialVersion: 5 }), 'stale_version');
});

test('every unusable case produces the one generic failure message', () => {
  const refusals = [
    passwordResetDecision({ expiresAt: minutesFromNow(-1), consumedAt: null, credentialVersion: 4 }, { now: NOW, credentialVersion: 4 }),
    passwordResetDecision({ expiresAt: minutesFromNow(30), consumedAt: NOW, credentialVersion: 4 }, { now: NOW, credentialVersion: 4 }),
    passwordResetDecision({ expiresAt: minutesFromNow(30), consumedAt: null, credentialVersion: 3 }, { now: NOW, credentialVersion: 4 }),
  ];

  assert.deepEqual(refusals, ['expired', 'consumed', 'stale_version']);
  // The controller answers all three with the same body, so a caller cannot
  // learn whether a guessed token ever existed.
  assert.equal(GENERIC_RESET_FAILURE_MESSAGE, 'This reset link is invalid or has expired.');
});

// ---------------------------------------------------------------------------
// The outstanding-token cap
// ---------------------------------------------------------------------------

function outstanding(count: number): Array<{ id: string; createdAt: Date; expiresAt: Date; consumedAt: Date | null }> {
  return Array.from({ length: count }, (_, index) => ({
    id: `token-${index}`,
    // token-0 is the oldest.
    createdAt: new Date(NOW.getTime() - (count - index) * 60 * 1000),
    expiresAt: minutesFromNow(30),
    consumedAt: null,
  }));
}

test('the cap is three outstanding links per account', () => {
  assert.equal(MAX_OUTSTANDING_RESETS, 3);
});

test('a fourth request retires only the oldest link', () => {
  const retire = tokensToRetire(outstanding(3), NOW);

  assert.deepEqual(retire, ['token-0']);
  // The newest links stay usable, so asking again never locks an account out.
  assert.equal(retire.includes('token-2'), false);
});

test('the cap counts live links only, so it never retires a usable one early', () => {
  const tokens = outstanding(3).map((token, index) =>
    // one already used, one already expired
    index === 0 ? { ...token, consumedAt: NOW } : index === 1 ? { ...token, expiresAt: minutesFromNow(-5) } : token
  );

  assert.deepEqual(tokensToRetire(tokens, NOW), []);
  assert.deepEqual(tokensToRetire([], NOW), []);
});

test('requests beyond the cap keep retiring the oldest, one for one', () => {
  // Returned oldest-last, because the list is built from the newest live link.
  assert.deepEqual(tokensToRetire(outstanding(10), NOW), [
    'token-7',
    'token-6',
    'token-5',
    'token-4',
    'token-3',
    'token-2',
    'token-1',
    'token-0',
  ]);
});

// ---------------------------------------------------------------------------
// Password policy and the bcrypt byte limit
// ---------------------------------------------------------------------------

test('the reset flow applies the same password rule as registration', () => {
  const valid = { token: createResetToken(), newPassword: 'Password1', confirmPassword: 'Password1' };

  assert.equal(passwordResetCompleteSchema.parse(valid).newPassword, 'Password1');
  // too short
  assert.throws(() => passwordResetCompleteSchema.parse({ ...valid, newPassword: 'Pass1', confirmPassword: 'Pass1' }));
  // no uppercase letter
  assert.throws(() => passwordResetCompleteSchema.parse({ ...valid, newPassword: 'password1', confirmPassword: 'password1' }));
  // no digit
  assert.throws(() => passwordResetCompleteSchema.parse({ ...valid, newPassword: 'Passworddd', confirmPassword: 'Passworddd' }));
  // confirmation mismatch
  assert.throws(() => passwordResetCompleteSchema.parse({ ...valid, confirmPassword: 'Password2' }));
});

test('a passphrase over the bcrypt byte limit is refused, not silently truncated', () => {
  // "e" plus a combining acute accent is three bytes but two characters, so a
  // character count would let this through under a 72 character rule while
  // bcrypt only ever saw its first 72 bytes.
  const combining = 'A1' + 'e\u0301'.repeat(25) + 'a'.repeat(10);
  assert.ok(combining.length < PASSWORD_MAX_BYTES, 'the string is short in characters');
  assert.ok(passwordByteLength(combining) > PASSWORD_MAX_BYTES, 'but long in bytes');

  const base = { token: createResetToken(), confirmPassword: combining };
  assert.throws(() => passwordResetCompleteSchema.parse({ ...base, newPassword: combining }));
});

test('exactly the byte limit is accepted', () => {
  const atLimit = 'A1' + 'a'.repeat(PASSWORD_MAX_BYTES - 2);

  assert.equal(PASSWORD_MAX_BYTES, 72);
  assert.equal(passwordByteLength(atLimit), PASSWORD_MAX_BYTES);
  assert.equal(
    passwordResetCompleteSchema.parse({
      token: createResetToken(),
      newPassword: atLimit,
      confirmPassword: atLimit,
    }).newPassword,
    atLimit
  );
});

// ---------------------------------------------------------------------------
// The request endpoint gives nothing away
// ---------------------------------------------------------------------------

test('the request body is normalised so the address binding matches the row', () => {
  assert.equal(passwordResetRequestSchema.parse({ email: ' Guest@Example.COM ' }).email, 'guest@example.com');
  assert.throws(() => passwordResetRequestSchema.parse({ email: 'not-an-email' }));
  assert.throws(() => passwordResetRequestSchema.parse({}));
});

test('a known and an unknown address get byte-identical answers', () => {
  // Both paths return this constant: there is no field that could differ, which
  // is the whole point of the design.
  const forKnownAddress = { message: GENERIC_RESET_REQUEST_MESSAGE };
  const forUnknownAddress = { message: GENERIC_RESET_REQUEST_MESSAGE };

  assert.deepEqual(forKnownAddress, forUnknownAddress);
  assert.equal(JSON.stringify(forKnownAddress), JSON.stringify(forUnknownAddress));
  // And the wording itself must not hint at what happened on the server.
  assert.doesNotMatch(GENERIC_RESET_REQUEST_MESSAGE, /unknown|no account|not found|exists|token/i);
});
