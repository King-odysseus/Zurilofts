// Final wiring for the host growth work:
// 1. the admin CONFLICT -> CONFIRMED path must charge the host's own commission,
//    not the global one, or a founding host is overcharged on that path;
// 2. tidy the double blank line left by removing the duplicate nudge scheduler.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function patchText(relPath, edits) {
  const file = path.join(root, relPath);
  let text = fs.readFileSync(file, 'utf8');
  for (const [label, find, replace] of edits) {
    const before = text;
    text = text.replace(find, replace);
    if (text === before) throw new Error(`${relPath}: ${label} did not match`);
    console.log(`  ${relPath}: ${label}`);
  }
  fs.writeFileSync(file, text);
}

const bookingOld = `    const { calculateHostNet } = await import('./payment.service.js');
    const { computeHostPayableAt } = await import('../utils/payoutTiming.js');
    const { env } = await import('../config/env.js');
    const hn = calculateHostNet({
      subtotal: booking.subtotal,
      discountAmount: booking.discountAmount,
      extraGuestFee,
      cleaningFee: booking.cleaningFee,
      lateCheckoutFee: booking.lateCheckoutFee,
      serviceFee: booking.serviceFee,
      promoOwnerHostId: booking.promoCode?.hostId ?? null,
    });`.replace(/\n/g, '\r\n');

const bookingNew = `    const { calculateHostNet, HOST_EARNING_POLICY } = await import('./payment.service.js');
    const { resolveHostCommissionRate } = await import('./foundingHost.service.js');
    const { computeHostPayableAt } = await import('../utils/payoutTiming.js');
    const { env } = await import('../config/env.js');
    // A founding host agreed a lower commission for the life of the account, so
    // this path resolves their own rate too. Charging the global rate here would
    // take money they were promised the moment an admin resolves a conflict.
    const hostId = booking.property?.hostId ?? null;
    const commissionRate = hostId ? await resolveHostCommissionRate(hostId) : null;
    const hn = calculateHostNet(
      {
        subtotal: booking.subtotal,
        discountAmount: booking.discountAmount,
        extraGuestFee,
        cleaningFee: booking.cleaningFee,
        lateCheckoutFee: booking.lateCheckoutFee,
        serviceFee: booking.serviceFee,
        promoOwnerHostId: booking.promoCode?.hostId ?? null,
      },
      commissionRate === null ? undefined : { ...HOST_EARNING_POLICY, commissionRate },
    );`.replace(/\n/g, '\r\n');

patchText('server/src/services/booking.service.ts', [['conflict path uses the host rate', bookingOld, bookingNew]]);

patchText('server/src/index.ts', [['collapse double blank line', '}\r\n\r\n\r\n// Periodically deliver', '}\r\n\r\n// Periodically deliver']]);

console.log('done');
