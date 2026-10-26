/**
 * The public fee schedule quoted on the become-a-host page.
 *
 * Run from server/:
 *   node --import tsx --test tests/public-fees.test.ts
 *
 * The calculator and the booking flow must agree on units: config stores the
 * commission as a fraction (0.1) while the page shows a percentage (10). These
 * tests pin that conversion and the guards that stop bad config from rendering
 * "KES NaN" to a prospective host.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { env } from '../src/config/env.js';
import { getPublicFeeSchedule } from '../src/services/settings.service.js';

/** Run fn with temporary overrides on the parsed env, then restore. */
function withEnv(overrides: Record<string, string>, fn: () => void): void {
  const mutable = env as unknown as Record<string, string>;
  const saved: Record<string, string> = {};
  for (const [key, value] of Object.entries(overrides)) {
    saved[key] = mutable[key];
    mutable[key] = value;
  }
  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) mutable[key] = value;
  }
}

test('a fractional commission is published as a percentage', () => {
  withEnv({ HOST_COMMISSION_RATE: '0.1' }, () => {
    assert.equal(getPublicFeeSchedule().commissionPercent, 10);
  });
  withEnv({ HOST_COMMISSION_RATE: '0.05' }, () => {
    assert.equal(getPublicFeeSchedule().commissionPercent, 5);
  });
});

test('the guest service fee is converted the same way as the commission', () => {
  withEnv({ GUEST_SERVICE_FEE_RATE: '0.12' }, () => {
    assert.equal(getPublicFeeSchedule().guestServiceFeePercent, 12);
  });
});

test('withholding tax is already a percentage and is not converted twice', () => {
  // Env holds "5" meaning 5%, unlike the two rates above which hold fractions.
  withEnv({ WITHHOLDING_TAX_RATE: '5' }, () => {
    assert.equal(getPublicFeeSchedule().withholdingTaxPercent, 5);
  });
});

test('the flat fees and hold window the calculator needs are included', () => {
  const schedule = getPublicFeeSchedule();
  assert.ok(schedule.cleaningFee > 0, 'cleaning fee must be published');
  assert.ok(schedule.extraGuestFeePerNight > 0, 'extra guest fee must be published');
  assert.ok(Number.isFinite(schedule.fundsHoldHours));
});

test('junk in config yields numbers, never NaN, so the page cannot render NaN', () => {
  withEnv(
    {
      HOST_COMMISSION_RATE: 'not-a-number',
      GUEST_SERVICE_FEE_RATE: '',
      WITHHOLDING_TAX_RATE: 'oops',
      HOST_FUNDS_HOLD_HOURS: 'x',
    },
    () => {
      const schedule = getPublicFeeSchedule();
      for (const [key, value] of Object.entries(schedule)) {
        if (typeof value === 'number') {
          assert.ok(Number.isFinite(value), `${key} must stay a finite number`);
        }
      }
      assert.equal(schedule.withholdingTaxPercent, 0);
      assert.equal(schedule.fundsHoldHours, 0);
    }
  );
});

test('a percentage typed where a fraction belongs is clamped, not multiplied out', () => {
  // Boot validation rejects this, so it can only arrive from a hand-edited env
  // after startup. The page must still show a sane number rather than 1500%.
  withEnv({ HOST_COMMISSION_RATE: '15' }, () => {
    const { commissionPercent } = getPublicFeeSchedule();
    assert.ok(commissionPercent <= 100, `expected at most 100, got ${commissionPercent}`);
  });
});

test('a negative rate cannot become a negative commission', () => {
  withEnv({ HOST_COMMISSION_RATE: '-0.2' }, () => {
    assert.equal(getPublicFeeSchedule().commissionPercent, 0);
  });
});
