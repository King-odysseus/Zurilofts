/**
 * Sign-up nudge rules.
 *
 * A nudge is a notification, so the cost of a wrong decision is a host feeling
 * pestered rather than money moving. The rules are still worth pinning: they
 * decide when a host who has clearly moved on stops being contacted, and the
 * cap is the only thing standing between a bug and an endless reminder.
 *
 * Run from server/:
 *   node --import tsx --test tests/nudge.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  nudgeMessage,
  parseNudgeAfterDays,
  parseNudgeMax,
  shouldNudge,
} from '../src/services/nudge.service.js';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-26T12:00:00.000Z');

/** A candidate that would be reminded, so each test can change one thing. */
function candidate(overrides = {}) {
  return {
    status: 'DRAFT',
    nudgeCount: 0,
    lastActivityAt: new Date(now.getTime() - 3 * DAY),
    lastNudgeAt: null,
    now,
    afterDays: 2,
    maxNudges: 2,
    nudgeableStatuses: ['DRAFT', 'CHANGES_REQUESTED'],
    ...overrides,
  };
}

// ---------------------------------------------------------------
// Settings
// ---------------------------------------------------------------

test('the cap of 0 leaves the sweep off', () => {
  assert.equal(parseNudgeMax('0'), 0);
  assert.equal(parseNudgeMax(undefined), 0);
  assert.equal(parseNudgeMax('abc'), 0);
});

test('a negative cap cannot resurrect the sweep', () => {
  assert.equal(parseNudgeMax('-2'), 0);
});

test('the cap is a whole number of reminders', () => {
  assert.equal(parseNudgeMax('3'), 3);
  assert.equal(parseNudgeMax('2.9'), 2);
});

test('a nonsense idle period falls back to 0 rather than blocking every nudge', () => {
  assert.equal(parseNudgeAfterDays('nonsense'), 0);
  assert.equal(parseNudgeAfterDays(-5), 0);
  assert.equal(parseNudgeAfterDays('4'), 4);
});

// ---------------------------------------------------------------
// When to remind
// ---------------------------------------------------------------

test('an application left untouched past the idle window is nudged', () => {
  assert.equal(shouldNudge(candidate()), true);
});

test('an application edited today is left alone', () => {
  assert.equal(shouldNudge(candidate({ lastActivityAt: new Date(now.getTime() - 1000) })), false);
});

test('an application inside the idle window is left alone', () => {
  assert.equal(shouldNudge(candidate({ lastActivityAt: new Date(now.getTime() - 1 * DAY) })), false);
});

test('the reminder stops once the cap is reached', () => {
  assert.equal(shouldNudge(candidate({ nudgeCount: 2 })), false);
  assert.equal(shouldNudge(candidate({ nudgeCount: 3 })), false);
});

test('a status the applicant cannot act on is never nudged', () => {
  // Awaiting review or already decided: a reminder would be noise.
  for (const status of ['SUBMITTED', 'APPROVED', 'REJECTED']) {
    assert.equal(shouldNudge(candidate({ status })), false, status);
  }
});

test('an application already reminded inside the window is not reminded again', () => {
  assert.equal(shouldNudge(candidate({ lastNudgeAt: new Date(now.getTime() - 1 * DAY) })), false);
});

test('a reminder older than the window allows the next one', () => {
  assert.equal(shouldNudge(candidate({ lastNudgeAt: new Date(now.getTime() - 3 * DAY) })), true);
});

test('a switched-off sweep never nudges', () => {
  assert.equal(shouldNudge(candidate({ maxNudges: 0 })), false);
});

// ---------------------------------------------------------------
// What the reminder says
// ---------------------------------------------------------------

test('an application awaiting a change is reminded of that change, not of finishing it', () => {
  const message = nudgeMessage('CHANGES_REQUESTED');
  assert.match(message.title, /change/i);
  assert.equal(message.url, '/host/application');
});

test('a half-finished application is invited to finish, with its saved state acknowledged', () => {
  const message = nudgeMessage('DRAFT');
  assert.match(message.title, /finish/i);
  assert.match(message.body, /saved/i);
  assert.equal(message.url, '/host/application');
});
