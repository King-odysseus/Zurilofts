/**
 * Guest-facing payment records.
 *
 * A receipt is the only document a guest keeps after money has left their
 * account, so it has to state what they were charged, in what currency, by
 * which legal entity, and whether it was actually paid. Two rules shape this
 * file:
 *
 * 1. It takes a plain booking object, not a Prisma client, so every number on
 *    the document can be unit tested without a database.
 * 2. It never sees the host's side of the money. hostCommission, hostNetAmount,
 *    withholdingTax and platformRevenue are commercial internals; showing them
 *    would tell a guest what the host was paid and invite a dispute about a
 *    split that is not theirs. The input type simply has no room for them.
 *
 * Whether this is also a tax invoice is a separate question that depends on the
 * platform's VAT registration. See config/company.ts for that switch.
 *
 * WIRING NOTE for whoever builds the HTTP route on top of this. This service is
 * deliberately free of express and Prisma, so the route does the fetching and
 * authorisation and this file only shapes the document:
 *
 *   const row = await prisma.booking.findUniqueOrThrow({
 *     where: { id },
 *     include: {
 *       property: { select: { title: true, location: true } },
 *       addOns: { include: { addOn: { select: { name: true } } } },
 *     },
 *   });
 *   const payload = buildReceipt(row);
 *
 * The addOns include is not optional. Without it the line sum falls short of
 * chargedKes by addOnsTotal, which is the visible mismatch linesSumKes exists
 * to expose - correct behaviour for a broken query, wrong output for a guest.
 *
 * Authorise to the booking's own user (or an admin) before calling. Never pass
 * a row belonging to someone else: the payload contains their stay and
 * payment reference. The Prisma BookingStatus enum is assignable to `status`
 * here, so both the SQLite and PostgreSQL clients work without a cast.
 */
import { company, type VatMode } from '../config/company.js';
import { calculateNights } from '../utils/pricing.js';

/** One add-on bought with the booking, as stored on the BookingAddOn row. */
export interface ReceiptAddOn {
  quantity: number;
  /** Snapshot taken at booking time, so a later catalogue change cannot rewrite it. */
  unitPrice: number;
  addOn: { name: string };
}

/**
 * The booking fields a receipt needs. Optional addOns because a caller may load
 * the booking without that relation; a missing relation then shows no add-on
 * lines rather than throwing on a document the guest already paid for.
 */
export interface ReceiptBooking {
  id: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  bedOption: string | null;
  /** 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'CONFLICT', widened for both schemas. */
  status: string;
  paymentReference: string | null;
  paymentChannel: string | null;
  paymentGateway: string | null;
  paidAt: Date | null;
  refundStatus: string | null;
  createdAt: Date;
  /** What the guest was charged, gateway fee included. */
  total: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  lateCheckoutFee: number;
  discountAmount: number;
  addOnsTotal: number;
  /** The processor's collection fee, already inside `total`, never an extra. */
  paymentFee: number;
  property: { title: string; location: string };
  addOns?: ReceiptAddOn[];
}

/** Which line this is, so the browser can print it in the reader's language. */
export type ReceiptLineCode =
  | 'accommodation'
  | 'cleaning'
  | 'service'
  | 'lateCheckout'
  | 'addOn'
  | 'discount'
  | 'paymentFee';

export interface ReceiptLine {
  /**
   * Stable machine name for the line. The label is English, which is the right
   * default for a document the server owns, but the app is bilingual: the
   * browser re-labels the standard lines from the reader's language and keeps
   * `label` only for an add-on, whose name is host-written content.
   */
  code: ReceiptLineCode;
  label: string;
  amountKes: number;
}

export interface ReceiptIssuer {
  legalName: string;
  tradingName: string;
  supportEmail: string;
  website: string;
  registrationNumber: string;
  registeredAddress: string;
  vat: {
    mode: VatMode;
    number: string;
    rate: number;
  };
}

export interface Receipt {
  receiptNumber: string;
  /** ISO timestamp the document refers to: when it was paid, else when it was created. */
  issuedAt: string;
  isReceipt: boolean;
  documentTitle: 'RECEIPT' | 'BOOKING SUMMARY';
  status: string;
  currency: 'KES';
  issuer: ReceiptIssuer;
  guest: {
    bookingId: string;
    reference: string | null;
  };
  stay: {
    propertyTitle: string;
    location: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    bedOption: string | null;
  };
  lines: ReceiptLine[];
  totals: {
    /** What the guest was charged, taken from the stored total. */
    chargedKes: number;
    /** What the lines actually add up to, so a disagreement is visible. */
    linesSumKes: number;
    /** What has been collected: the total for a receipt, nothing for a summary. */
    paidKes: number;
    /** VAT contained in the charged amount, or null when no VAT is stated. */
    vatKes: number | null;
  };
  payment: {
    reference: string | null;
    channel: string | null;
    gateway: string | null;
    paidAt: string | null;
  };
  refund: { status: string } | null;
}

/** A stable YYYYMMDD stamp. UTC so every server produces the same number. */
function dateStamp(value: Date): string {
  return value.toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * A reference the guest and support can both quote.
 *
 * This is a reference, not a sequential tax-invoice number. A numbered series
 * is a requirement for a VAT-registered supplier issuing tax invoices, and
 * nothing here is registered for VAT yet (see config/company.ts). Formatting it
 * from the booking itself means the same booking always produces the same
 * number, so a reprint, a support ticket and an email cannot disagree.
 */
export function receiptNumberFor(booking: Pick<ReceiptBooking, 'id' | 'paidAt' | 'createdAt'>): string {
  const stamp = dateStamp(booking.paidAt ?? booking.createdAt);
  return `ZL-${stamp}-${booking.id.slice(0, 8).toUpperCase()}`;
}

/**
 * The itemised lines, in the order a guest reads a bill: what the stay cost,
 * the fees attached to it, anything extra they bought, their discount, and
 * finally the cost of taking the payment.
 *
 * Only non-zero components appear. A line reading "Service fee: KES 0" makes a
 * guest suspect they were charged for something, so the absence of a line is
 * the clearer signal. Accommodation is the exception: a document with no lines
 * at all would look broken.
 */
function buildLines(booking: ReceiptBooking): ReceiptLine[] {
  const lines: ReceiptLine[] = [{ code: 'accommodation', label: 'Accommodation', amountKes: booking.subtotal }];

  if (booking.cleaningFee !== 0) lines.push({ code: 'cleaning', label: 'Cleaning fee', amountKes: booking.cleaningFee });
  if (booking.serviceFee !== 0) lines.push({ code: 'service', label: 'Service fee', amountKes: booking.serviceFee });
  if (booking.lateCheckoutFee !== 0) lines.push({ code: 'lateCheckout', label: 'Late check-out fee', amountKes: booking.lateCheckoutFee });

  for (const item of booking.addOns ?? []) {
    // quantity is stored on the row and unitPrice is a Float, so the line is
    // rounded once, here, and never again downstream.
    const amount = Math.round(item.quantity * item.unitPrice);
    const label = item.quantity > 1 ? `${item.addOn.name} x${item.quantity}` : item.addOn.name;
    lines.push({ code: 'addOn', label, amountKes: amount });
  }

  // Negative, because a discount reduces the amount owed. Printed as a positive
  // number it reads like another charge.
  if (booking.discountAmount !== 0) {
    lines.push({ code: 'discount', label: 'Discount', amountKes: -Math.abs(booking.discountAmount) });
  }

  if (booking.paymentFee !== 0) {
    lines.push({ code: 'paymentFee', label: 'Payment processing fee', amountKes: booking.paymentFee });
  }

  return lines;
}

/**
 * VAT contained in an already VAT-inclusive amount, or null when the platform
 * states no VAT.
 *
 * Kenyan prices are quoted VAT-inclusive, so VAT is extracted from the total,
 * never added on top of it: amount * rate / (100 + rate). Adding 16% to the
 * total instead would overcharge every guest by the tax on the tax.
 */
function vatContainedIn(amountKes: number): number | null {
  if (company.vatMode === 'none') return null;
  return Math.round((amountKes * company.vatRate) / (100 + company.vatRate));
}

function iso(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

/**
 * Build the document a guest can download for one booking.
 *
 * Everything is derived from stored values rather than recomputed: a receipt
 * that recalculates the price can disagree with what was charged, and the
 * charge is the fact.
 */
export function buildReceipt(booking: ReceiptBooking): Receipt {
  // Normalized once so every use below agrees on what "no payment date" means;
  // a caller that omits the field must not read as paid.
  const paidAt = booking.paidAt ?? null;
  // Only collected money can be receipted. A document headed "receipt" for a
  // booking that was never paid would misrepresent payment to the guest, to
  // their bank and to anyone they show it to, so an unpaid booking gets a
  // booking summary instead.
  //
  // A CONFIRMED stay carrying a payment reference counts as paid even when the
  // timestamp is missing: across this codebase a booking is only CONFIRMED
  // after the gateway confirms the money, so refusing it a receipt would tell a
  // guest who did pay that nothing was received. A PENDING or CANCELLED booking
  // with a reference is a checkout that was started, not finished, and stays a
  // summary.
  const isReceipt = paidAt !== null
    || (booking.status === 'CONFIRMED' && booking.paymentReference !== null);
  const lines = buildLines(booking);
  const linesSumKes = lines.reduce((sum, line) => sum + line.amountKes, 0);

  return {
    receiptNumber: receiptNumberFor(booking),
    issuedAt: (paidAt ?? booking.createdAt).toISOString(),
    isReceipt,
    documentTitle: isReceipt ? 'RECEIPT' : 'BOOKING SUMMARY',
    status: booking.status,
    currency: 'KES',
    issuer: {
      legalName: company.legalName,
      tradingName: company.tradingName,
      supportEmail: company.supportEmail,
      website: company.website,
      registrationNumber: company.registrationNumber,
      registeredAddress: company.registeredAddress,
      vat: {
        mode: company.vatMode,
        number: company.vatNumber,
        rate: company.vatRate,
      },
    },
    guest: {
      bookingId: booking.id,
      reference: booking.paymentReference,
    },
    stay: {
      propertyTitle: booking.property.title,
      location: booking.property.location,
      checkIn: booking.checkIn.toISOString(),
      checkOut: booking.checkOut.toISOString(),
      // Shared with the pricing path so the nights on the receipt cannot be a
      // second, slightly different count from the nights that were billed.
      nights: calculateNights(booking.checkIn, booking.checkOut),
      guests: booking.guests,
      bedOption: booking.bedOption,
    },
    lines,
    totals: {
      chargedKes: booking.total,
      // Returned rather than compared-and-thrown: a stored row that no longer
      // adds up is a data problem an admin has to investigate, and refusing to
      // print the receipt would leave the guest with no record of money they
      // did pay. Showing both numbers makes the gap visible instead.
      linesSumKes,
      paidKes: isReceipt ? booking.total : 0,
      vatKes: vatContainedIn(booking.total),
    },
    payment: {
      reference: booking.paymentReference,
      channel: booking.paymentChannel,
      gateway: booking.paymentGateway,
      paidAt: iso(paidAt),
    },
    // Null unless a refund has actually been recorded, so a normal receipt has
    // no empty refund block for a guest to wonder about.
    refund: booking.refundStatus ? { status: booking.refundStatus } : null,
  };
}
