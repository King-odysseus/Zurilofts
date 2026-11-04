/**
 * The guest's payment record, rendered as a PDF in the browser.
 *
 * The figures come from GET /bookings/:id/receipt rather than from whichever
 * booking object a page happens to hold. A receipt rebuilt from a list row can
 * show a different total from the one on file, and the stored total is the
 * fact; rebuilding it client side also let a guest's own cached copy disagree
 * with support. jsPDF is imported dynamically so the library is fetched only
 * when someone actually asks for a receipt.
 *
 * Labels are passed in as `t` so the document prints in the language the reader
 * chose. Only an add-on keeps its own name, because that text is host-written
 * content, not interface copy.
 */
import apiClient from '../api/client.js';

// A4 in millimetres. `bottom` is where content stops before a new page starts.
const PAGE = { width: 210, margin: 14, bottom: 268 };

// Which dictionary entry names each standard line. A line code the browser does
// not recognise falls back to the label the server sent, so a receipt is never
// blank for an unknown fee type.
const LINE_LABEL_KEYS = {
  accommodation: 'booking.receiptLineAccommodation',
  cleaning: 'booking.receiptLineCleaning',
  service: 'booking.receiptLineService',
  lateCheckout: 'booking.receiptLineLateCheckout',
  discount: 'booking.receiptLineDiscount',
  paymentFee: 'booking.receiptLinePaymentFee',
};

const STATUS_KEYS = {
  PENDING: 'booking.statusPending',
  CONFIRMED: 'booking.statusConfirmed',
  CANCELLED: 'booking.statusCancelled',
  CONFLICT: 'booking.statusNeedsAttention',
};

const REFUND_KEYS = {
  REFUND_PENDING: 'booking.receiptRefundPending',
  REFUNDED: 'booking.receiptRefunded',
  REFUND_DECLINED: 'booking.receiptRefundDeclined',
};

function money(amount) {
  if (amount == null) return '-';
  const sign = amount < 0 ? '-' : '';
  return `${sign}KES ${Math.abs(Number(amount)).toLocaleString('en-KE')}`;
}

function formatDate(iso, locale) {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso).slice(0, 10);
  return date.toLocaleDateString(locale === 'sw' ? 'sw-KE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusLabel(receipt, t) {
  const key = STATUS_KEYS[receipt.status];
  return key ? t(key) : receipt.status;
}

function lineLabel(line, t) {
  if (line.code === 'addOn') return line.label;
  const key = LINE_LABEL_KEYS[line.code];
  return key ? t(key) : line.label;
}

/**
 * Build and save the PDF. Throws if jsPDF cannot be loaded, so the caller can
 * tell the guest instead of leaving a button that appears to do nothing.
 */
export async function renderReceipt(receipt, t, locale) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const left = PAGE.margin;
  const right = PAGE.width - PAGE.margin;
  let y = 20;

  // Starts a new page when the next block would run into the footer area.
  function ensureSpace(height) {
    if (y + height <= PAGE.bottom) return;
    doc.addPage();
    y = 20;
  }

  function row(label, value, options = {}) {
    ensureSpace(options.height || 6);
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(options.size || 9.5);
    doc.setTextColor(options.muted ? 107 : 31, options.muted ? 114 : 41, options.muted ? 128 : 55);
    doc.text(String(label), left, y);
    doc.text(String(value), right, y, { align: 'right' });
    y += options.height || 6;
  }

  function sectionHeading(text) {
    ensureSpace(12);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    // Tracked-out caps read as a section label rather than as a charge.
    doc.text(text.toUpperCase(), left, y);
    y += 5;
  }

  function rule() {
    ensureSpace(4);
    doc.setDrawColor(229, 231, 235);
    doc.line(left, y - 2, right, y - 2);
    y += 3;
  }

  // Masthead: the brand over the company that actually contracts with the
  // guest. Naming both is the point of the document - a brand alone is not a
  // legal person a court or a tax authority can act against.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(20, 58, 128);
  doc.text(receipt.issuer.tradingName || 'ZuriLofts', left, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text(receipt.issuer.legalName, left, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(31, 41, 55);
  doc.text(receipt.isReceipt ? t('booking.receipt') : t('booking.receiptSummaryTitle'), right, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text(receipt.receiptNumber, right, y + 5, { align: 'right' });

  y += 12;
  rule();

  row(t('booking.receiptIssued'), formatDate(receipt.issuedAt, locale), { muted: true, size: 8.5, height: 5.5 });
  row(t('booking.receiptStatus'), statusLabel(receipt, t), { muted: true, size: 8.5, height: 5.5 });

  // A booking nobody has paid for must never read as proof of payment, so the
  // document says so plainly instead of leaving the reader to infer it from a
  // zero amount paid.
  if (!receipt.isReceipt) {
    ensureSpace(8);
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9);
    doc.text(t('booking.receiptNotPaid'), left, y);
    y += 6;
  }

  sectionHeading(t('booking.receiptStay'));
  row(t('booking.receiptProperty'), receipt.stay.propertyTitle || '-');
  row(t('booking.receiptLocation'), receipt.stay.location || '-');
  row(t('booking.checkIn'), formatDate(receipt.stay.checkIn, locale));
  row(t('booking.checkOut'), formatDate(receipt.stay.checkOut, locale));
  row(t('booking.receiptNights'), String(receipt.stay.nights));
  row(t('booking.receiptGuestsLabel'), String(receipt.stay.guests));

  sectionHeading(t('booking.receiptCharges'));
  receipt.lines.forEach((line) => row(lineLabel(line, t), money(line.amountKes)));

  y += 1;
  rule();
  row(t('booking.receiptTotalCharged'), money(receipt.totals.chargedKes), { bold: true, size: 10.5 });
  row(t('booking.receiptAmountPaid'), money(receipt.totals.paidKes), { bold: true, size: 10.5 });

  // VAT is only stated once the platform is actually registered; until then
  // making no claim is the honest option. See server/src/config/company.ts.
  if (receipt.totals.vatKes != null) {
    row(t('booking.receiptVatIncluded', { rate: receipt.issuer.vat.rate }), money(receipt.totals.vatKes), { muted: true, size: 8.5 });
    if (receipt.issuer.vat.number) {
      row(t('booking.receiptVatNumber'), receipt.issuer.vat.number, { muted: true, size: 8.5 });
    }
  }

  if (receipt.isReceipt) {
    sectionHeading(t('booking.receiptPayment'));
    if (receipt.payment.reference) row(t('booking.receiptPaymentRef'), receipt.payment.reference);
    if (receipt.payment.channel) row(t('booking.receiptPaymentMethod'), receipt.payment.channel);
    if (receipt.payment.paidAt) row(t('booking.receiptPaidOn'), formatDate(receipt.payment.paidAt, locale));
  }

  if (receipt.refund) {
    const refundKey = REFUND_KEYS[receipt.refund.status];
    row(t('booking.receiptRefund'), refundKey ? t(refundKey) : receipt.refund.status);
  }

  // Footer: how to reach the company, and only the facts that are known. The
  // registration number and address print once they are filled in, never as a
  // guess.
  ensureSpace(28);
  y += 4;
  rule();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(receipt.issuer.legalName, left, y);
  y += 4.5;
  if (receipt.issuer.registrationNumber) {
    doc.text(`${t('booking.receiptRegistrationNumber')}: ${receipt.issuer.registrationNumber}`, left, y);
    y += 4.5;
  }
  if (receipt.issuer.registeredAddress) {
    doc.text(receipt.issuer.registeredAddress, left, y);
    y += 4.5;
  }
  doc.text(`${receipt.issuer.supportEmail}  |  ${receipt.issuer.website}`, left, y);
  y += 6;
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(t('booking.receiptComputerGenerated'), left, y);

  doc.save(`ZuriLofts_Receipt_${receipt.receiptNumber}.pdf`);
}

/**
 * Fetch the authoritative record and save it. Used by every screen that offers
 * a receipt, so the lookup and the rendering live in one place.
 */
export async function downloadReceipt(bookingId, t, locale) {
  const response = await apiClient.get(`/bookings/${bookingId}/receipt`);
  const receipt = response.data?.data;
  if (!receipt) throw new Error('Receipt unavailable');
  await renderReceipt(receipt, t, locale);
}
