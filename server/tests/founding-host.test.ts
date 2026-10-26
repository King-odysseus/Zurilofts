/**
 * Founding-host programme rules.
 *
 * The first FOUNDING_HOST_LIMIT approved hosts pay FOUNDING_HOST_COMMISSION_RATE
 * instead of HOST_COMMISSION_RATE, for life. Two things here cost real money if
 * they are wrong: enrolling too many hosts gives away commission the platform
 * never agreed to, and picking the wrong rate either overcharges a host who was
 * promised a discount or charges a nonsense rate that pays them a multiplied or
 * negative amount. Both decisions are pure functions, so they are pinned here
 * with no database and no network.
 *
 * Run from server/:
 *   node --import tsx --test tests/founding-host.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseCommissionRate,
  parseFoundingHostLimit,
  planFoundingEnrolment,
  pickCommissionRate,
} from '../src/services/foundingHost.service.js';
import { calculateHostEarnings } from '../src/utils/hostEarnings.js';

// ---------------------------------------------------------------
// Programme size
// ---------------------------------------------------------------

test('a limit of 0 switches the programme off, which is the shipped default', () => {
  // Nothing is given away until someone decides how many places to fund, so the
  // default config must offer no places rather than an unbounded number.
  assert.equal(parseFoundingHostLimit('0'), 0);
  assert.equal(planFoundingEnrolment(0, parseFoundingHostLimit('0')), false);
});

test('an unusable limit offers no places instead of guessing', () => {
  // A typo in the env var must not enrol the whole host base at the discounted
  // rate, so anything that is not a positive number means "programme off".
  for (const raw of ['', 'abc', '-3', undefined, 'NaN', 'Infinity']) {
    assert.equal(parseFoundingHostLimit(raw), 0);
    assert.equal(planFoundingEnrolment(0, parseFoundingHostLimit(raw)), false);
  }
});

test('a real limit is read as whole hosts', () => {
  // Places are counted in hosts, so a fractional value must not leave a
  // half-place that enrols one extra host.
  assert.equal(parseFoundingHostLimit('5'), 5);
  assert.equal(parseFoundingHostLimit(5), 5);
  assert.equal(parseFoundingHostLimit('3.7'), 3);
});

// ---------------------------------------------------------------
// Enrolment decision
// ---------------------------------------------------------------

test('a free place is taken while the programme has room', () => {
  // The whole point of the programme: the first hosts in get the lower rate.
  assert.equal(planFoundingEnrolment(0, 3), true);
  assert.equal(planFoundingEnrolment(1, 3), true);
  assert.equal(planFoundingEnrolment(2, 3), true);
});

test('the last place is the last one, not one more', () => {
  // Off-by-one here overcharges nobody but undercharges the platform forever,
  // because a founding rate is granted for life.
  assert.equal(planFoundingEnrolment(3, 3), false);
});

test('an over-subscribed programme enrols nobody, even after the limit is lowered', () => {
  // Lowering FOUNDING_HOST_LIMIT below the number already enrolled must stop
  // new discounts; it can never claw back the ones already granted.
  assert.equal(planFoundingEnrolment(4, 3), false);
  assert.equal(planFoundingEnrolment(10, 3), false);
});

// ---------------------------------------------------------------
// Which rate a host pays
// ---------------------------------------------------------------

test('a founding host is charged the founding rate', () => {
  assert.equal(pickCommissionRate(true, 0.15, 0.05), 0.05);
});

test('a normal host is charged the global rate even when a founding rate exists', () => {
  // The founding rate is a perk of the programme, never a live discount for
  // everyone who happens to approve after the places ran out.
  assert.equal(pickCommissionRate(false, 0.15, 0.05), 0.15);
});

test('a nonsense founding rate falls back to the global rate', () => {
  // NaN would make commission NaN and wipe out the stored split; a negative
  // rate would pay the host more than the guest paid. Both fall back instead.
  assert.equal(pickCommissionRate(true, 0.15, Number.NaN), 0.15);
  assert.equal(pickCommissionRate(true, 0.15, -0.05), 0.15);
});

test('a founding rate above 100% falls back to the global rate', () => {
  // A rate over 1 is not a fraction of the accommodation subtotal, it is a
  // multiplied charge, so it is unusable configuration rather than a rate.
  assert.equal(parseCommissionRate(1.5), null);
  assert.equal(pickCommissionRate(true, 0.15, 1.5), 0.15);
});

test('a founding rate higher than the global rate is honoured, not clamped', () => {
  // Both numbers are configuration. If the business sets a higher founding rate
  // (for example while winding the programme down) code must not quietly
  // rewrite it to the global rate; the operator would see a different split
  // than the one they configured.
  assert.equal(pickCommissionRate(true, 0.15, 0.2), 0.2);
});

test('the global rate is the last line of defence, and a zero rate is real', () => {
  // A broken global rate must still produce a chargeable number, and an explicit
  // 0 (no commission at all) must survive rather than be read as "unset".
  assert.equal(pickCommissionRate(false, Number.NaN, 0.05), 0);
  assert.equal(pickCommissionRate(false, 0, 0.05), 0);
  assert.equal(pickCommissionRate(true, 0, 0), 0);
});

test('with no founding rate configured at all the global rate still applies', () => {
  // The programme can be switched on before FOUNDING_HOST_COMMISSION_RATE is
  // set; that must charge the normal rate, not an undefined one.
  assert.equal(pickCommissionRate(true, 0.15, Number.NaN), 0.15);
});

// ---------------------------------------------------------------
// The rate actually reaching the money split
// ---------------------------------------------------------------

test('the chosen rate changes the commission the founding host pays', () => {
  // Ties the rule to the arithmetic payment confirmation uses: on a 10,000 KES
  // stay the founding host keeps 1,000 KES more than a host on the global 15%,
  // which is the promise the programme makes.
  const input = { subtotal: 10000 };
  const normal = calculateHostEarnings(
    input,
    { commissionRate: pickCommissionRate(false, 0.15, 0.05), payCleaningFee: false, payLateCheckoutFee: false, platformFundsPromo: false },
    0.05,
  );
  const founding = calculateHostEarnings(
    input,
    { commissionRate: pickCommissionRate(true, 0.15, 0.05), payCleaningFee: false, payLateCheckoutFee: false, platformFundsPromo: false },
    0.05,
  );

  assert.equal(normal.commission, 1500);
  assert.equal(founding.commission, 500);
  // Money is whole KES integers, and the split must still reconcile.
  assert.equal(founding.hostNet, 9000);
  assert.equal(
    founding.guestPaid,
    founding.hostNet + founding.withholdingTax + founding.platformRevenue,
  );
});
