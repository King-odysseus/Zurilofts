/**
 * Which stored files are conversation attachments, and what may be asked for.
 *
 * Chat files are the one upload family that is not public: they belong to a
 * private message between two people. Listing photos and avatars stay public
 * because the public site renders them, so the distinction is made here, from
 * the stored name, and both the delivery route and the static guard use it.
 *
 * The prefix is the whole signal. Every chat file the upload endpoint writes
 * starts with `msg-`; nothing else is allowed to reach it.
 */

// Generated names carry a timestamp and random hex after the prefix. A local
// file keeps the extension we chose; a Cloudinary raw upload is stored under a
// public id with no extension, so the extension is optional.
const CHAT_FILE_PATTERN = /^msg-[a-z0-9-]{1,80}(?:\.(?:jpg|jpeg|png|webp|pdf))?$/i;

export function isChatAttachmentFilename(name: string): boolean {
  return CHAT_FILE_PATTERN.test(name);
}

/**
 * The filename a stored attachment URL refers to, or null when the URL is not
 * one of ours.
 *
 * Only our two storage shapes are accepted: a local `/uploads/...` path, and a
 * Cloudinary delivery URL in our folder. A file name that merely looks generated
 * on somebody else's host is not ours, and this is also what stops the delivery
 * route being asked to fetch a foreign address on the server's behalf.
 */
export function chatAttachmentFilename(url: string): string | null {
  if (typeof url !== 'string') return null;

  const localPath = url.startsWith('/uploads/');
  const cloudinaryUrl = url.startsWith('https://res.cloudinary.com/') && url.includes('/zurilofts/');
  if (!localPath && !cloudinaryUrl) return null;

  // Query strings and fragments are not part of the name.
  const pathOnly = url.split(/[?#]/)[0];
  const lastSegment = pathOnly.split('/').pop();
  if (!lastSegment) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(lastSegment);
  } catch {
    // Malformed percent-encoding is caller input, not a server fault.
    return null;
  }

  return isChatAttachmentFilename(decoded) ? decoded : null;
}

/** True when a stored path or delivery URL names a chat attachment. */
export function isChatAttachmentUrl(url: string): boolean {
  return chatAttachmentFilename(url) !== null;
}

/**
 * True for a request path that specifically asks for a chat file.
 *
 * The guard in front of the public upload directory runs BEFORE the static
 * handler, and the two read the path differently: this middleware sees the raw
 * request path, while `send` (inside express.static) decodes it before touching
 * the filesystem. Comparing only the raw form let `/%6dsg-123-secret.pdf`
 * through the guard and then served the decoded `msg-123-secret.pdf` - a
 * one-character bypass of the whole private-attachment rule.
 *
 * So every segment is checked in both forms, and malformed percent-encoding is
 * refused rather than guessed at (our own names are plain ASCII, so a name that
 * cannot be decoded is not one of ours).
 */
export function requestsChatAttachment(pathOrSegment: string): boolean {
  const rawSegments = String(pathOrSegment).split('/');
  for (const raw of rawSegments) {
    if (raw.toLowerCase().startsWith('msg-')) return true;
    let decoded: string;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return true;
    }
    if (decoded.toLowerCase().startsWith('msg-')) return true;
    // A decoded separator means one segment becomes several.
    if (decoded.includes('/') && decoded.split('/').some((part) => part.toLowerCase().startsWith('msg-'))) {
      return true;
    }
  }
  return false;
}
