/**
 * What a failed Google sign-in records in the log.
 *
 * passport hands the failure over as a third-party error object whose useful part
 * is one field deep, and the operator only ever reads the log line. These cases
 * pin the two things that matter: the reason survives the trip, and nothing from
 * the response body beyond Google's own error fields reaches the log.
 *
 * Run from server/:
 *   node --import tsx --test tests/oauth-diagnostics.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { summarizeOAuthFailure } from '../src/utils/oauthDiagnostics.js';

/** The shape passport-oauth2 builds when the token endpoint refuses the code. */
function tokenEndpointRefusal(body: unknown) {
  return {
    name: 'InternalOAuthError',
    message: 'Failed to obtain access token',
    oauthError: { statusCode: 401, data: typeof body === 'string' ? body : JSON.stringify(body) },
  };
}

test('a refused token exchange reports the code Google gave', () => {
  const summary = summarizeOAuthFailure(
    tokenEndpointRefusal({ error: 'invalid_client', error_description: 'Unauthorized' })
  );
  assert.deepEqual(summary, { code: 'invalid_client', detail: 'Unauthorized' });
});

test('a reused or expired code is distinguishable from a bad secret', () => {
  const summary = summarizeOAuthFailure(
    tokenEndpointRefusal({ error: 'invalid_grant', error_description: 'Bad Request' })
  );
  assert.equal(summary.code, 'invalid_grant');
});

test('the raw response body is not copied into the log', () => {
  // Google can extend its body at any time. Only the two named fields are read,
  // so an extra field can never be echoed into the log by accident.
  const summary = summarizeOAuthFailure(
    tokenEndpointRefusal({
      error: 'invalid_client',
      error_description: 'Unauthorized',
      some_future_field: 'access_token=ya29.secret',
    })
  );
  assert.ok(!JSON.stringify(summary).includes('ya29'));
});

test('an error sent back instead of a code keeps its passport code', () => {
  const summary = summarizeOAuthFailure({
    name: 'AuthorizationError',
    message: 'Grant: invalid_request',
    code: 'invalid_request',
  });
  assert.deepEqual(summary, { code: 'invalid_request', detail: 'Grant: invalid_request' });
});

test('a callback with no code reports what passport said about it', () => {
  const summary = summarizeOAuthFailure({ message: 'Missing code parameter' });
  assert.deepEqual(summary, { code: 'unknown', detail: 'Missing code parameter' });
});

test('a database failure keeps its Prisma code on one line', () => {
  // This is the failure that broke sign-in in production: a column the database
  // does not have. The P-code is what makes it obvious at a glance.
  const summary = summarizeOAuthFailure({
    code: 'P2022',
    message: 'Invalid `prisma.user.findUnique()` invocation:\n\n\nThe column `User.dateOfBirth` does not exist.',
  });
  assert.equal(summary.code, 'P2022');
  assert.ok(summary.detail.includes('User.dateOfBirth'));
  assert.ok(!summary.detail.includes('\n'));
});

test('a response body that is not the expected JSON still reports something', () => {
  const summary = summarizeOAuthFailure({
    name: 'InternalOAuthError',
    message: 'Failed to obtain access token',
    oauthError: { statusCode: 502, data: '<html>Bad gateway</html>' },
  });
  assert.deepEqual(summary, { code: 'unknown', detail: 'Failed to obtain access token' });
});

test('nothing to report at all stays quiet rather than throwing', () => {
  assert.deepEqual(summarizeOAuthFailure(undefined), { code: 'unknown', detail: '' });
  assert.deepEqual(summarizeOAuthFailure(null), { code: 'unknown', detail: '' });
});

test('a very long reason is clipped so one failure stays one log line', () => {
  const summary = summarizeOAuthFailure(
    tokenEndpointRefusal({ error: 'invalid_request', error_description: 'x'.repeat(400) })
  );
  assert.equal(summary.code, 'invalid_request');
  assert.equal(summary.detail.length, 163);
  assert.ok(summary.detail.endsWith('...'));
});
