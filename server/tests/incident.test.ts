/**
 * Behaviour tests for the personal-data incident register.
 *
 * The register exists so the company can show, if the regulator asks, when it
 * became aware of a breach and when it reported it. These pin the parts that
 * make it usable as that evidence: the 72-hour arithmetic, the rule that a
 * recorded notification time cannot be rewritten, and a notice that is honest
 * about what is not yet known.
 *
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/incident.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRegulatorNotice,
  incidentClock,
  incidentDeclareSchema,
  incidentUpdateSchema,
  notificationDeadline,
  planIncidentUpdate,
  toIncidentView,
  type IncidentRow,
} from '../src/services/incident.service.js';

const AWARE = new Date('2026-11-09T06:00:00.000Z'); // 09:00 in Nairobi
const HOUR = 60 * 60 * 1000;

function row(overrides: Partial<IncidentRow> = {}): IncidentRow {
  return {
    id: 'inc-1',
    reference: 'DI-20261109-A1B2C3',
    title: 'Misdirected export',
    summary: 'A guest list export was emailed to the wrong recipient.',
    status: 'OPEN',
    awareAt: AWARE,
    dataCategories: JSON.stringify(['NAMES', 'CONTACT_DETAILS']),
    affectedCount: 12,
    consequences: null,
    measuresTaken: null,
    regulatorNotifiedAt: null,
    regulatorReference: null,
    delayReason: null,
    usersNotifiedAt: null,
    closedAt: null,
    closingNote: null,
    declaredById: 'admin-1',
    declaredByEmail: 'admin@example.com',
    createdAt: AWARE,
    updatedAt: AWARE,
    ...overrides,
  };
}

// ---- The clock ----

test('the deadline is exactly 72 hours after the company became aware', () => {
  assert.equal(notificationDeadline(AWARE).toISOString(), '2026-11-12T06:00:00.000Z');
});

test('an open incident is running until the deadline and overdue after it', () => {
  const running = incidentClock(row(), new Date(AWARE.getTime() + 60 * HOUR));
  assert.equal(running.state, 'RUNNING');
  assert.equal(running.hoursRemaining, 12);

  const overdue = incidentClock(row(), new Date(AWARE.getTime() + 80 * HOUR));
  assert.equal(overdue.state, 'OVERDUE');
  assert.equal(overdue.hoursRemaining, -8);
});

test('a notice sent inside the window stays on time however long ago it was', () => {
  const sent = new Date(AWARE.getTime() + 71 * HOUR);
  const later = new Date(AWARE.getTime() + 500 * HOUR);
  assert.equal(incidentClock(row({ regulatorNotifiedAt: sent }), later).state, 'NOTIFIED_ON_TIME');
});

test('a notice sent after the window is recorded as late', () => {
  const sent = new Date(AWARE.getTime() + 73 * HOUR);
  assert.equal(incidentClock(row({ regulatorNotifiedAt: sent }), sent).state, 'NOTIFIED_LATE');
});

test('an incident closed without a notice says so rather than reading as on time', () => {
  const clock = incidentClock(row({ closedAt: new Date(AWARE.getTime() + HOUR) }), new Date(AWARE.getTime() + 200 * HOUR));
  assert.equal(clock.state, 'CLOSED_WITHOUT_NOTICE');
  assert.equal(clock.hoursRemaining, null);
});

// ---- Recording the regulator notice ----

test('recording the notice inside the window needs no reason and moves the status on', () => {
  const now = new Date(AWARE.getTime() + 10 * HOUR);
  const data = planIncidentUpdate(row(), { action: 'REGULATOR_NOTIFIED', regulatorReference: 'ODPC-77' }, now);
  assert.equal(data.status, 'REGULATOR_NOTIFIED');
  assert.equal(data.regulatorNotifiedAt?.toISOString(), now.toISOString());
  assert.equal(data.regulatorReference, 'ODPC-77');
  assert.equal(data.delayReason, null);
});

test('a notice after 72 hours is refused without a reason for the delay', () => {
  const now = new Date(AWARE.getTime() + 90 * HOUR);
  assert.throws(() => planIncidentUpdate(row(), { action: 'REGULATOR_NOTIFIED' }, now), /reason for the delay/i);
  const data = planIncidentUpdate(row(), { action: 'REGULATOR_NOTIFIED', delayReason: 'Found out late from a vendor.' }, now);
  assert.equal(data.delayReason, 'Found out late from a vendor.');
});

test('the notification time cannot be rewritten once it is recorded', () => {
  const done = row({ status: 'REGULATOR_NOTIFIED', regulatorNotifiedAt: new Date(AWARE.getTime() + HOUR) });
  assert.throws(
    () => planIncidentUpdate(done, { action: 'REGULATOR_NOTIFIED' }, new Date(AWARE.getTime() + 2 * HOUR)),
    /already recorded/i,
  );
});

test('a notification time before awareness or in the future is refused', () => {
  const now = new Date(AWARE.getTime() + 10 * HOUR);
  assert.throws(
    () => planIncidentUpdate(row(), { action: 'REGULATOR_NOTIFIED', notifiedAt: new Date(AWARE.getTime() - HOUR) }, now),
    /before the company became aware/i,
  );
  assert.throws(
    () => planIncidentUpdate(row(), { action: 'REGULATOR_NOTIFIED', notifiedAt: new Date(now.getTime() + 2 * HOUR) }, now),
    /future/i,
  );
});

test('telling the affected people is recorded once and does not change the status', () => {
  const now = new Date(AWARE.getTime() + 5 * HOUR);
  const data = planIncidentUpdate(row(), { action: 'USERS_NOTIFIED' }, now);
  assert.equal(data.usersNotifiedAt?.toISOString(), now.toISOString());
  assert.equal(data.status, undefined);
  assert.throws(
    () => planIncidentUpdate(row({ usersNotifiedAt: now }), { action: 'USERS_NOTIFIED' }, now),
    /already recorded/i,
  );
});

// ---- Closing and editing ----

test('closing records when and why; a closed incident can no longer change', () => {
  const now = new Date(AWARE.getTime() + 30 * HOUR);
  const data = planIncidentUpdate(row(), { action: 'CLOSE', closingNote: 'Recipient confirmed deletion; no risk to people.' }, now);
  assert.equal(data.status, 'CLOSED');
  assert.equal(data.closedAt?.toISOString(), now.toISOString());

  const closed = row({ status: 'CLOSED', closedAt: now });
  assert.throws(() => planIncidentUpdate(closed, { action: 'EDIT', title: 'New title' }, now), /closed/i);
});

test('an edit with nothing in it is refused, and categories are stored as JSON', () => {
  assert.throws(() => planIncidentUpdate(row(), { action: 'EDIT' }, AWARE), /nothing to change/i);
  const data = planIncidentUpdate(row(), { action: 'EDIT', dataCategories: ['NAMES'], affectedCount: 40 }, AWARE);
  assert.equal(data.dataCategories, '["NAMES"]');
  assert.equal(data.affectedCount, 40);
});

// ---- Request validation ----

test('declaring needs a description, a real time and at least one kind of data', () => {
  const ok = incidentDeclareSchema.safeParse({
    title: 'Misdirected export',
    summary: 'A guest list export was emailed to the wrong recipient.',
    awareAt: '2026-11-09T06:00:00.000Z',
    dataCategories: ['NAMES'],
  });
  assert.equal(ok.success, true);

  const bad = incidentDeclareSchema.safeParse({
    title: 'x',
    summary: 'short',
    awareAt: 'not a date',
    dataCategories: [],
  });
  assert.equal(bad.success, false);
});

test('an unknown action or data category is rejected', () => {
  assert.equal(incidentUpdateSchema.safeParse({ action: 'DELETE' }).success, false);
  assert.equal(
    incidentDeclareSchema.safeParse({
      title: 'Test incident',
      summary: 'Something happened to the data.',
      awareAt: '2026-11-09T06:00:00.000Z',
      dataCategories: ['SECRETS'],
    }).success,
    false,
  );
});

// ---- The notice ----

test('the notice carries the facts and is honest about what is not yet known', () => {
  const view = toIncidentView(row(), new Date(AWARE.getTime() + 5 * HOUR));
  const notice = buildRegulatorNotice(view, new Date(AWARE.getTime() + 5 * HOUR));

  assert.match(notice, /Office of the Data Protection Commissioner/);
  assert.match(notice, /DI-20261109-A1B2C3/);
  assert.match(notice, /09 ?:?00|9:00/); // 06:00 UTC shown as Nairobi time
  assert.match(notice, /EAT/);
  assert.match(notice, /- Names/);
  assert.match(notice, /Number of people affected: 12/);
  assert.match(notice, /Not yet assessed/);
  assert.match(notice, /Not yet recorded/);
  assert.match(notice, /have not yet been told/);
});

test('a late notice states the delay reason and no delay text appears otherwise', () => {
  const lateRow = row({
    regulatorNotifiedAt: new Date(AWARE.getTime() + 80 * HOUR),
    delayReason: 'Vendor told us on day three.',
  });
  const late = buildRegulatorNotice(toIncidentView(lateRow));
  assert.match(late, /Vendor told us on day three\./);

  const onTime = buildRegulatorNotice(toIncidentView(row()));
  assert.equal(/Reason for the delay/.test(onTime), false);
});

test('the notice never contains staff contact details', () => {
  const notice = buildRegulatorNotice(toIncidentView(row()));
  assert.equal(notice.includes('admin@example.com'), false);
});
