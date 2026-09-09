// Shared PDF receipt/invoice generator - used by BookingHistoryPage and
// TripHubPage's "next stay" receipt action so it stays one implementation.

const STATUS_LABELS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
};

function formatDate(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatCurrency(n) {
  if (n == null) return '-';
  return `KES ${Number(n).toLocaleString()}`;
}

/**
 * Downloads a computer-generated PDF receipt for a booking. Dynamic import so
 * jsPDF is only fetched when a receipt is actually requested.
 */
export function generateInvoice(booking) {
  import('jspdf').then(({ jsPDF }) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(34, 34, 34); // #222222
    doc.text('ZuriLofts - Booking Invoice', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // #6b7280
    doc.text(`Booking #${booking.id ? booking.id.slice(0, 8) : '-'}`, 14, 28);

    let y = 36;
    const items = [
      ['Property', booking.property?.title || '-'],
      ['Location', booking.property?.location || 'Nairobi'],
      ['Check-in', formatDate(booking.checkIn)],
      ['Check-out', formatDate(booking.checkOut)],
      ['Guests', String(booking.guests || 1)],
      ['Status', STATUS_LABELS[booking.status] || booking.status],
    ];
    if (booking.subtotal != null) {
      items.push(
        ['Subtotal', formatCurrency(booking.subtotal)],
        ['Cleaning Fee', formatCurrency(booking.cleaningFee || 0)],
        ['Service Fee', formatCurrency(booking.serviceFee || 0)],
      );
    }
    if (booking.discountAmount) items.push(['Discount', `-KES ${Number(booking.discountAmount).toLocaleString()}`]);
    if (booking.lateCheckoutFee) items.push(['Late Check-out Fee', formatCurrency(booking.lateCheckoutFee)]);
    items.push(
      ['Total', formatCurrency(booking.total)],
      ['Payment Ref', booking.paymentReference ? booking.paymentReference.slice(0, 16) : '-'],
    );

    items.forEach(([label, value]) => {
      doc.setFontSize(9);
      doc.setTextColor(34, 34, 34);
      doc.text(label, 14, y);
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(value, 14, y + 5);
      y += 11;
    });

    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text('This is a computer-generated invoice.', 14, y + 2);

    doc.save(`ZuriLofts_Invoice_${booking.id ? booking.id.slice(0, 8) : 'booking'}.pdf`);
  }).catch((err) => console.error('Failed to generate invoice:', err));
}
