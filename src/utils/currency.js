/**
 * One price format for the whole product.
 *
 * The site used to label the same amount "KSh" on a stay card and "KES" on the
 * detail page, at checkout, in the host payout tables and in the legal terms.
 * Side by side that reads like two currencies, so every displayed amount now
 * goes through here. The label is KES because that is what the Terms page
 * already defines for every price charged.
 */

/** Format an amount as Kenyan shillings, or null when there is no usable number. */
export function formatPrice(amount) {
  if (amount === null || amount === undefined || amount === '') return null;
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;
  // Prices are whole shillings; the fraction cap only stops a stray decimal
  // from rendering as a long float.
  return `KES ${value.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
}
