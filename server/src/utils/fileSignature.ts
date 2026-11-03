/**
 * Content checks for uploaded files.
 *
 * A browser reports a MIME type from the filename the sender chose, so the type
 * a client declares is not evidence of what the bytes are. Anything stored and
 * later served has to be identified by its own contents.
 */

const PDF_SIGNATURE = Buffer.from('%PDF-');
// The PDF specification tolerates a little leading junk before the header, and
// readers look near the start rather than only at byte 0.
const PDF_SIGNATURE_WINDOW = 1024;

/** True when the buffer begins with a PDF header. */
export function looksLikePdf(buffer: Buffer): boolean {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return false;
  return buffer.subarray(0, PDF_SIGNATURE_WINDOW).indexOf(PDF_SIGNATURE) !== -1;
}
