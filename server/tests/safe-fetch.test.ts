/**
 * Pure tests for the calendar-feed guards. No database and no network: every
 * case here is decided before a connection would be made.
 *
 * Run from server/:
 *   node --import tsx --test tests/safe-fetch.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ical from 'node-ical';

import {
  fetchCalendarFeedText,
  isPublicAddress,
  mapWithConcurrency,
  validateOutboundUrl,
} from '../src/utils/safeFetch.js';

// ---- Address classification ----

test('private, loopback, link-local and reserved IPv4 addresses are not public', () => {
  for (const address of [
    '127.0.0.1',
    '127.10.20.30',
    '10.0.0.5',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254', // cloud metadata
    '0.0.0.0',
    '100.64.0.1',
    '192.0.2.10',
    '198.18.0.1',
    '203.0.113.9',
    '224.0.0.1',
    '255.255.255.255',
  ]) {
    assert.equal(isPublicAddress(address), false, `${address} must be refused`);
  }
});

test('public IPv4 addresses are allowed', () => {
  for (const address of ['8.8.8.8', '93.184.216.34', '172.32.0.1', '203.0.114.1']) {
    assert.equal(isPublicAddress(address), true, `${address} must be allowed`);
  }
});

test('private and reserved IPv6 addresses are not public', () => {
  for (const address of ['::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', 'ff02::1', '2001:db8::1']) {
    assert.equal(isPublicAddress(address), false, `${address} must be refused`);
  }
});

test('an IPv4-mapped IPv6 address inherits the IPv4 verdict', () => {
  assert.equal(isPublicAddress('::ffff:127.0.0.1'), false);
  assert.equal(isPublicAddress('::ffff:8.8.8.8'), true);
});

test('a public IPv6 address is allowed', () => {
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});

// ---- URL validation ----

test('non-http schemes are refused', () => {
  for (const url of ['ftp://example.com/feed.ics', 'file:///etc/passwd', 'javascript:alert(1)']) {
    assert.throws(() => validateOutboundUrl(url), /http:\/\/ or https:\/\//, `${url} must be refused`);
  }
});

test('literal internal addresses are refused before any connection', () => {
  for (const url of [
    'http://127.0.0.1:8080/feed.ics',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.1.2.3/feed.ics',
    'http://[::1]/feed.ics',
    'http://2130706433/feed.ics',
  ]) {
    assert.throws(() => validateOutboundUrl(url), /not a public calendar feed/, `${url} must be refused`);
  }
});

test('internal-looking host names are refused', () => {
  for (const url of ['http://localhost/feed.ics', 'http://calendar.internal/feed', 'http://box.local/feed.ics']) {
    assert.throws(() => validateOutboundUrl(url), /not a public calendar feed/, `${url} must be refused`);
  }
});

test('credentials embedded in the URL are refused', () => {
  assert.throws(() => validateOutboundUrl('https://user:secret@example.com/feed.ics'), /username and password/);
});

test('a normal public feed URL is accepted', () => {
  assert.equal(validateOutboundUrl('https://example.com/calendar.ics').hostname, 'example.com');
  assert.equal(validateOutboundUrl('http://example.com/feed.ics?token=abc').search, '?token=abc');
});

test('a malformed URL is refused with a plain explanation', () => {
  assert.throws(() => validateOutboundUrl('not a url'), /not a valid URL/);
});

test('fetching a blocked address fails without attempting a connection', async () => {
  // Port 9 (discard) is used so that, if the guard ever regressed, the test
  // would fail rather than reach anything real.
  await assert.rejects(fetchCalendarFeedText('http://127.0.0.1:9/feed.ics'), /not a public calendar feed/);
});

// ---- Concurrency ----

test('bounded concurrency keeps order and never exceeds the limit', async () => {
  let inFlight = 0;
  let peak = 0;
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const results = await mapWithConcurrency(items, 3, async (item) => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    return item * 2;
  });

  assert.equal(peak <= 3, true, `peak concurrency was ${peak}`);
  assert.deepEqual(
    results.map((result) => (result.status === 'fulfilled' ? result.value : null)),
    items.map((item) => item * 2)
  );
});

test('a failing task is reported without cancelling the others', async () => {
  const results = await mapWithConcurrency([1, 2, 3], 2, async (item) => {
    if (item === 2) throw new Error('feed unavailable');
    return item;
  });

  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.equal(results[2].status, 'fulfilled');
});

// ---- Feed parsing ----

// The sync now fetches the body itself and parses it, instead of letting
// node-ical open the connection. This pins the shape the sync relies on.
test('a fetched feed body parses into the events calendar sync expects', () => {
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    'UID:abc@airbnb',
    'DTSTART;VALUE=DATE:20261201',
    'DTEND;VALUE=DATE:20261203',
    'SUMMARY:Reserved',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const data = ical.sync.parseICS(body);
  const events = Object.values(data).filter(
    (entry) => entry && entry.type === 'VEVENT' && entry.start && entry.end
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].uid, 'abc@airbnb');
  assert.equal(new Date(events[0].start).toISOString(), '2026-12-01T00:00:00.000Z');
  assert.equal(new Date(events[0].end).toISOString(), '2026-12-03T00:00:00.000Z');
});
