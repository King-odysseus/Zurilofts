/**
 * Behaviour tests for the guest-paid Paystack fee.
 *
 * The rule these pin: the guest pays the gateway fee, and the platform must
 * still receive the full booking total afterwards. That only holds if the fee is
 * solved from the grossed-up amount (fee is a slice of what Paystack collects),
 * so a change to the formula here changes real money - add a case before
 * altering a rate.
 *
 * Run from server/:
 *   node --import tsx --test tests/gateway-fee.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeGatewayFee,
  totalWithGatewayFee,
  GATEWAY_FEE_RATE,
  type GatewayFeeConfig,
} from '../src/utils/pricing.js';

const PAYSTACK_KE: GatewayFeeConfig = { rate: GATEWAY_FEE_RATE, fixedKes: 0, capKes: 0 };

/** What Paystack keeps from a charge of `gross`, using the same rate. */
function paystackCut(gross: number, rate: number): number {
  return rate * gross;
}

test('the guest pays the fee and the platform is left with the whole total', () => {
  const net = 10000;
  const { gatewayFee, total } = totalWithGatewayFee(net, PAYSTACK_KE);

  assert.equal(total, net + gatewayFee);
  assert.ok(gatewayFee > 0, 'a 2.9% fee on 10,000 must be charged to the guest');

  // Paystack takes its cut of what was collected, not of the net.
  const afterPaystack = total - paystackCut(total, PAYSTACK_KE.rate);
  assert.ok(
    afterPaystack >= net,
    `platform must not be short: received ${afterPaystack}, expected at least ${net}`,
  );
  // Rounding up to the shilling may leave a fraction of a shilling more, never
  // more than a whole shilling of overcharge.
  assert.ok(afterPaystack - net < 1, 'the gross-up must not overcharge by more than rounding');
});

test('a fee of rate x net would leave the platform short, which is why it is grossed up', () => {
  const net = 10000;
  const naive = Math.round(net * PAYSTACK_KE.rate);
  const naiveAfterPaystack = net + naive - paystackCut(net + naive, PAYSTACK_KE.rate);

  assert.ok(
    naiveAfterPaystack < net,
    'the naive rate-on-net fee really does leave a shortfall, so the gross-up is required',
  );
  assert.ok(totalWithGatewayFee(net, PAYSTACK_KE).gatewayFee > naive);
});

test('the fee is rounded up to the whole shilling', () => {
  const fee = computeGatewayFee(1001, PAYSTACK_KE);
  assert.equal(fee, Math.ceil(fee));
  assert.ok(fee >= (PAYSTACK_KE.rate * 1001) / (1 - PAYSTACK_KE.rate));
});

test('a rate of zero switches the fee off so the platform absorbs it', () => {
  const config: GatewayFeeConfig = { rate: 0, fixedKes: 0, capKes: 0 };
  assert.deepEqual(totalWithGatewayFee(5000, config), { gatewayFee: 0, total: 5000 });
  assert.equal(computeGatewayFee(5000, config), 0);
});

test('a flat fee is covered too, not just the percentage', () => {
  const config: GatewayFeeConfig = { rate: 0.029, fixedKes: 100, capKes: 0 };
  const net = 20000;
  const { gatewayFee, total } = totalWithGatewayFee(net, config);

  const afterPaystack = total - (config.rate * total + config.fixedKes);
  assert.ok(afterPaystack >= net, `flat fee not recovered: received ${afterPaystack}`);
  assert.ok(gatewayFee > computeGatewayFee(net, PAYSTACK_KE));
});

test('a cap limits what the guest pays and the platform absorbs the rest', () => {
  const config: GatewayFeeConfig = { rate: 0.029, fixedKes: 0, capKes: 500 };
  const { gatewayFee, total } = totalWithGatewayFee(100000, config);

  assert.equal(gatewayFee, 500);
  assert.equal(total, 100500);
  // Capped, so the platform is deliberately short here rather than the guest
  // paying a fee above the advertised ceiling.
  assert.ok(total - paystackCut(total, config.rate) < 100000);
});

test('nothing is charged on a zero or negative amount', () => {
  assert.equal(computeGatewayFee(0, PAYSTACK_KE), 0);
  assert.equal(computeGatewayFee(-500, PAYSTACK_KE), 0);
  assert.equal(computeGatewayFee(Number.NaN, PAYSTACK_KE), 0);
  assert.deepEqual(totalWithGatewayFee(0, PAYSTACK_KE), { gatewayFee: 0, total: 0 });
});

test('a rate of 100% or more is refused instead of running away', () => {
  for (const rate of [1, 1.5, 2]) {
    assert.throws(
      () => computeGatewayFee(10000, { rate, fixedKes: 0, capKes: 0 }),
      /must be below 1/,
    );
  }
});

test('the total always equals the chargeable amount plus the fee', () => {
  for (const chargeable of [1, 999, 1500, 12500, 250000]) {
    const { gatewayFee, total } = totalWithGatewayFee(chargeable, PAYSTACK_KE);
    assert.equal(total, chargeable + gatewayFee, `mismatch at ${chargeable}`);
  }
});
