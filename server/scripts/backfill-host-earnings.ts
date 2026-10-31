/**
 * Fill in the host's share on bookings confirmed before the split was recorded.
 *
 * Why this exists: `hostNetAmount` and its siblings arrived with the payout
 * work, so any booking confirmed before that has a null share. The earnings
 * page sums that column, which is why old months read as zero.
 *
 * Why it is careful:
 * - It reuses `calculateHostNet` and `resolveHostCommissionRate`, the same
 *   functions the payment callback uses, so a backfilled booking is identical
 *   to one confirmed today. A second hand-rolled formula here would drift.
 * - It does NOT set `hostPayableAt` or `hostFundsReleasedAt`, and never touches
 *   `HostWallet`. That is deliberate: `releaseDueHostFunds` runs hourly and
 *   credits any confirmed booking whose `hostPayableAt` has passed into the
 *   withdrawable balance, so filling that column would quietly hand hosts money
 *   the platform never decided to release. Backfilled rows therefore show up in
 *   earnings and in `pendingBalance`, and stay unpayable until someone decides
 *   otherwise on purpose.
 * - It only fills nulls, so re-running it is harmless.
 *
 * Usage, from server/:
 *   npx tsx scripts/backfill-host-earnings.ts            # dry run, prints the plan
 *   npx tsx scripts/backfill-host-earnings.ts --apply    # writes the amounts
 */

import { PrismaClient } from '@prisma/client';
import { calculateHostNet, HOST_EARNING_POLICY } from '../src/services/payment.service.js';
import { resolveHostCommissionRate } from '../src/services/foundingHost.service.js';
import { calculateNights, computeExtraGuestFee } from '../src/utils/pricing.js';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  const bookings = await prisma.booking.findMany({
    where: { status: 'CONFIRMED', hostNetAmount: null },
    select: {
      id: true,
      guests: true,
      bedOption: true,
      checkIn: true,
      checkOut: true,
      subtotal: true,
      discountAmount: true,
      cleaningFee: true,
      lateCheckoutFee: true,
      serviceFee: true,
      property: { select: { title: true, hostId: true } },
      promoCode: { select: { hostId: true } },
    },
    orderBy: { checkIn: 'asc' },
  });

  if (bookings.length === 0) {
    console.log('Nothing to backfill: every confirmed booking already has a host share.');
    return;
  }

  console.log(`${apply ? 'Applying' : 'Dry run:'} ${bookings.length} confirmed booking(s) without a host share.\n`);

  let updated = 0;
  let totalHostNet = 0;

  for (const booking of bookings) {
    const hostId = booking.property?.hostId ?? null;
    const commissionRate = hostId ? await resolveHostCommissionRate(hostId) : null;
    const { hostNet, withholdingTax, commission, platformRevenue } = calculateHostNet(
      {
        subtotal: booking.subtotal,
        discountAmount: booking.discountAmount,
        extraGuestFee: computeExtraGuestFee(booking.guests, booking.bedOption, calculateNights(booking.checkIn, booking.checkOut)),
        cleaningFee: booking.cleaningFee,
        lateCheckoutFee: booking.lateCheckoutFee,
        serviceFee: booking.serviceFee,
        promoOwnerHostId: booking.promoCode?.hostId ?? null,
      },
      commissionRate === null ? HOST_EARNING_POLICY : { ...HOST_EARNING_POLICY, commissionRate },
    );

    totalHostNet += hostNet;
    console.log(
      `${booking.id}  ${booking.checkIn.toISOString().slice(0, 10)}  ` +
        `${booking.property?.title ?? 'listing removed'}  host ${hostNet}  ` +
        `(tax ${withholdingTax}, commission ${commission}, platform ${platformRevenue})`,
    );

    if (!apply) continue;

    // hostPayableAt / hostFundsReleasedAt are intentionally left as they are.
    await prisma.booking.update({
      where: { id: booking.id },
      data: { hostNetAmount: hostNet, withholdingTax, hostCommission: commission, platformRevenue },
    });
    updated += 1;
  }

  console.log(`\nHost share total: ${totalHostNet}`);
  if (!apply) {
    console.log('Nothing written. Re-run with --apply to store these amounts.');
    return;
  }
  console.log(`Updated ${updated} booking(s). Wallets and payout dates untouched.`);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
