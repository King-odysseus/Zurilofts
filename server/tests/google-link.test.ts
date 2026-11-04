/**
 * The rule that decides whether a Google sign-in may attach itself to an
 * account that already holds the same address.
 *
 * Pre-hijacking: registration never proves the person owns the mailbox, so an
 * attacker could register a stranger's address with a password of their own and
 * wait. Auto-linking on the victim's first Google sign-in then left the attacker
 * with a working password into the account. These cases pin the refusal.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { googleLinkDecision } from '../src/services/auth.service.js';

test('Google never links itself onto an account that has a password', () => {
  assert.equal(googleLinkDecision({ googleId: null, passwordHash: '$2a$12$hash' }), 'refuse-password');
});

test('an address already linked to another Google account is refused', () => {
  assert.equal(
    googleLinkDecision({ googleId: 'google-123', passwordHash: null }),
    'refuse-other-google'
  );
});

test('a passwordless account with no Google link is linked', () => {
  assert.equal(googleLinkDecision({ googleId: null, passwordHash: null }), 'link');
});
