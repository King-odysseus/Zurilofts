/**
 * Host earnings maths, kept free of config and database so every combination of
 * the money rules can be unit tested. payment.service.ts binds these to the
 * configured policy and tax rate; nothing else should duplicate the arithmetic.
 */

/** How money is split between host and platform. */
export interface HostEarningPolicy {
  /** Fraction of the accommodation subtotal the platform keeps (0.1 = 10%). */
  commissionRate: number;
  /** Pass the guest's cleaning fee through to the host. */
  payCleaningFee: boolean;
  /** Pass the guest's late check-out fee through to the host. */
  payLateCheckoutFee: boolean;
  /** true = the platform absorbs platform-wide promo codes. */
  platformFundsPromo: boolean;
}

export interface HostEarningInput {
  subtotal: number;
  /** Promo discount the guest received. */
  discountAmount?: number;
  extraGuestFee?: number;
  cleaningFee?: number;
  lateCheckoutFee?: number;
  /** Set when the promo belongs to this host, so they fund their own discount. */
  promoOwnerHostId?: string | null;
}

export interface HostEarning {
  /** Everything the host is owed for the stay, before deductions. */
  hostGross: number;
  /** Platform take, charged on accommodation only. */
  commission: number;
  withholdingTax: number;
  /** What actually reaches the host's wallet. */
  hostNet: number;
  /** The part of the promo discount that came out of the host's share. */
  hostFundedDiscount: number;
}

/**
 * Work out what a host is owed.
 *
 * Commission is charged on the accommodation subtotal only. Cleaning, extra
 * guest and late check-out amounts are pass-through costs the host has to
 * cover, so taking a cut of those would make hosting cost the host money.
 * Withholding tax keeps its original base (accommodation + extra guests) so
 * passing a fee through can never change what the host owes KRA.
 */
export function calculateHostEarnings(
  input: HostEarningInput,
  policy: HostEarningPolicy,
  withholdingTaxRate: number,
): HostEarning {
  const subtotal = Math.max(0, input.subtotal);
  const discountAmount = Math.max(0, input.discountAmount ?? 0);
  const extraGuestFee = Math.max(0, input.extraGuestFee ?? 0);
  const cleaningFee = policy.payCleaningFee ? Math.max(0, input.cleaningFee ?? 0) : 0;
  const lateCheckoutFee = policy.payLateCheckoutFee ? Math.max(0, input.lateCheckoutFee ?? 0) : 0;

  // A platform-wide code is marketing spend. A host's own code is a discount
  // that host chose to give, so they still carry it.
  const hostAbsorbsDiscount = !policy.platformFundsPromo || Boolean(input.promoOwnerHostId);
  const hostFundedDiscount = hostAbsorbsDiscount ? Math.min(discountAmount, subtotal) : 0;

  const accommodation = subtotal - hostFundedDiscount;
  const hostGross = accommodation + extraGuestFee + cleaningFee + lateCheckoutFee;
  const commission = Math.round(accommodation * policy.commissionRate);
  const withholdingTax = Math.round((accommodation + extraGuestFee) * withholdingTaxRate);
  // Never hand back a negative payout: a misconfigured rate must fail loudly in
  // reporting, not silently move money out of the host's wallet.
  const hostNet = Math.max(0, hostGross - commission - withholdingTax);

  return { hostGross, commission, withholdingTax, hostNet, hostFundedDiscount };
}
