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

/**
 * Image formats the app is willing to decode.
 *
 * The upload routes gate on the type the browser declares, and that label is the
 * sender's own choice: a file called photo.jpg can hold HEIF or SVG. sharp picks
 * its decoder from the bytes, so a label-only gate still reaches the libheif and
 * librsvg decoders and whatever advisories they carry. Checking the signature
 * first keeps the reachable decoder list to the four raster formats we serve.
 */
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'gif';

const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * The image format the bytes actually are, or null for anything else.
 *
 * Only formats this app can safely re-encode are recognised; an unrecognised
 * buffer is refused rather than handed to a decoder that might guess. Twelve
 * bytes is the shortest header checked here, and every real image is longer.
 */
export function detectImageFormat(buffer: Buffer): ImageFormat | null {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  if (buffer.subarray(0, 3).equals(JPEG_SIGNATURE)) return 'jpeg';
  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return 'png';

  const leading = buffer.subarray(0, 6).toString('latin1');
  if (leading === 'GIF87a' || leading === 'GIF89a') return 'gif';

  // RIFF container: the four bytes at offset 8 name the form.
  if (buffer.subarray(0, 4).toString('latin1') === 'RIFF'
    && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';

  return null;
}

/** True when the buffer begins with a PDF header. */
export function looksLikePdf(buffer: Buffer): boolean {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return false;
  return buffer.subarray(0, PDF_SIGNATURE_WINDOW).indexOf(PDF_SIGNATURE) !== -1;
}
